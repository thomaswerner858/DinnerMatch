
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Recipe, User, Swipe, Match } from './types';
import { MOCK_USERS } from './lib/mockData';
import { supabase } from './lib/supabase';
import SwipeCard from './components/SwipeCard';
import MatchCelebration from './components/MatchCelebration';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  PlusCircle, 
  History, 
  ChefHat, 
  Calendar, 
  CheckCircle2,
  UtensilsCrossed,
  Heart,
  X,
  Plus,
  Camera,
  Upload,
  Loader2
} from 'lucide-react';

const App: React.FC = () => {
  // Wir nutzen für die Demo weiterhin die Mock-IDs, bis Auth implementiert ist.
  // WICHTIG: Die IDs müssen in Supabase existieren oder die Constraints im SQL müssen flexibel sein.
  const [currentUser] = useState<User>(MOCK_USERS[0]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Recipe | null>(null);
  const [view, setView] = useState<'home' | 'swipe' | 'recipes'>('home');
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Add Recipe Form State
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    content: '',
    imageData: ''
  });

  const today = new Date().toISOString().split('T')[0];

  // Initiales Laden der Daten aus Supabase
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      // 1. Rezepte laden
      const { data: recipesData } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (recipesData) {
        const formattedRecipes: Recipe[] = recipesData.map(r => ({
          id: r.id,
          title: r.title,
          description: r.content,
          ingredients: [],
          imageUrl: r.image_url,
          createdBy: r.created_by
        }));
        setAllRecipes(formattedRecipes);
      }

      // 2. Swipes von heute laden
      const { data: swipesData } = await supabase
        .from('swipes')
        .select('*')
        .eq('day', today)
        .eq('user_id', currentUser.id);
      
      if (swipesData) setSwipes(swipesData);

      setIsLoading(false);
    };

    fetchData();

    // REALTIME: Auf neue Swipes hören für Matches
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', 
        { event: 'INSERT', table: 'swipes' }, 
        async (payload) => {
          const newSwipe = payload.new;
          
          // Wenn Partner liked, prüfen ob wir auch geliked haben
          if (newSwipe.user_id === currentUser.partnerId && newSwipe.type === 'like' && newSwipe.day === today) {
            const { data: mySwipe } = await supabase
              .from('swipes')
              .select('*')
              .eq('user_id', currentUser.id)
              .eq('recipe_id', newSwipe.recipe_id)
              .eq('day', today)
              .eq('type', 'like')
              .single();

            if (mySwipe) {
              const matchedRecipe = allRecipes.find(r => r.id === newSwipe.recipe_id);
              if (matchedRecipe) {
                setCurrentMatch(matchedRecipe);
                setMatches(prev => [...prev, {
                  id: Math.random().toString(),
                  recipeId: matchedRecipe.id,
                  date: today,
                  partnerIds: [currentUser.id, currentUser.partnerId]
                }]);
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, today, allRecipes]);

  const hasSwipedToday = useMemo(() => {
    return swipes.some(s => s.userId === currentUser.id || (s as any).user_id === currentUser.id);
  }, [swipes, currentUser.id]);

  const dailyRecipe = useMemo(() => {
    if (allRecipes.length === 0) return null;
    const index = new Date().getDate() % allRecipes.length;
    return allRecipes[index];
  }, [allRecipes]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!dailyRecipe) return;

    const type = direction === 'right' ? 'like' : 'dislike';
    
    // In Supabase speichern
    const { data, error } = await supabase
      .from('swipes')
      .insert({
        user_id: currentUser.id,
        recipe_id: dailyRecipe.id,
        type: type,
        day: today
      })
      .select()
      .single();

    if (!error && data) {
      setSwipes(prev => [...prev, data]);
    }
  }, [currentUser, dailyRecipe, today]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRecipe(prev => ({ ...prev, imageData: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    let finalImageUrl = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800';

    // 1. Bild zu Supabase Storage hochladen
    if (selectedFile) {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('recipe-images')
        .upload(fileName, selectedFile);

      if (!uploadError) {
        const { data } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
        finalImageUrl = data.publicUrl;
      }
    }

    // 2. Rezept in DB speichern
    const { data, error } = await supabase
      .from('recipes')
      .insert({
        title: newRecipe.title,
        content: newRecipe.content,
        image_url: finalImageUrl,
        created_by: currentUser.id
      })
      .select()
      .single();

    if (!error && data) {
      const newFormatted: Recipe = {
        id: data.id,
        title: data.title,
        description: data.content,
        ingredients: [],
        imageUrl: data.image_url,
        createdBy: data.created_by
      };
      setAllRecipes(prev => [newFormatted, ...prev]);
      setIsAddingRecipe(false);
      setNewRecipe({ title: '', content: '', imageData: '' });
      setSelectedFile(null);
    }
    setIsLoading(false);
  };

  if (isLoading && allRecipes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="animate-spin text-orange-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfcfb] flex flex-col relative overflow-hidden shadow-2xl border-x border-gray-100">
      <header className="px-6 py-8 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            DinnerMatch <UtensilsCrossed className="text-orange-500" size={24} />
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Verbunden mit Supabase</p>
        </div>
      </header>

      <main className="flex-grow px-6 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pt-4"
            >
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-orange-100/50 border border-orange-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6">
                  <ChefHat className="text-orange-200" size={40} />
                </div>
                
                <h2 className="text-xl font-bold text-gray-900 mb-2">Daily Match</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">Triff heute eine bewusste Wahl für euer Abendessen.</p>
                
                {!hasSwipedToday ? (
                  <button 
                    onClick={() => setView('swipe')}
                    disabled={!dailyRecipe}
                    className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all transform active:scale-95 disabled:opacity-50"
                  >
                    Vorschlag ansehen
                  </button>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                    <span className="text-emerald-900 font-bold">Erledigt für heute!</span>
                    <p className="text-emerald-700 text-xs mt-1">Checke deine Matches unten.</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Eure Matches</h3>
                {matches.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <Heart className="mx-auto text-gray-200 mb-3" size={40} />
                    <p className="text-gray-400 text-sm font-medium px-10">Noch keine Matches. Swiped beide nach rechts!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {matches.map((match, idx) => {
                      const recipe = allRecipes.find(r => r.id === match.recipeId);
                      return (
                        <div key={idx} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                          <img src={recipe?.imageUrl} className="w-full h-28 object-cover rounded-xl mb-3" alt={recipe?.title} />
                          <p className="font-bold text-sm text-gray-800 truncate">{recipe?.title}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'swipe' && (
            <motion.div 
              key="swipe"
              className="h-[65vh] relative mt-4"
            >
              {!dailyRecipe ? (
                 <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <p className="text-gray-400">Keine Rezepte verfügbar. Füge erst welche hinzu!</p>
                 </div>
              ) : hasSwipedToday ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <div className="bg-emerald-100 p-8 rounded-full">
                    <Calendar className="text-emerald-600" size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Bis morgen!</h2>
                  <button onClick={() => setView('home')} className="px-10 py-4 bg-gray-900 text-white font-bold rounded-2xl">Dashboard</button>
                </div>
              ) : (
                <SwipeCard recipe={dailyRecipe} onSwipe={handleSwipe} isTop={true} />
              )}
            </motion.div>
          )}

          {view === 'recipes' && (
            <motion.div key="recipes" className="space-y-6 pt-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Rezepte</h2>
                <button onClick={() => setIsAddingRecipe(true)} className="bg-orange-600 text-white p-3 rounded-2xl shadow-lg"><Plus size={24} /></button>
              </div>
              <div className="space-y-4">
                {allRecipes.map(recipe => (
                  <div key={recipe.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100">
                    <img src={recipe.imageUrl} className="w-24 h-24 rounded-2xl object-cover" alt={recipe.title} />
                    <div className="flex-grow">
                      <h4 className="font-bold text-gray-900">{recipe.title}</h4>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{recipe.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-xl border-t border-gray-100 px-10 py-5 flex justify-between items-center z-40">
        <NavButton active={view === 'home'} icon={<ChefHat />} label="Home" onClick={() => setView('home')} />
        <NavButton active={view === 'swipe'} icon={<UtensilsCrossed />} label="Swipe" onClick={() => setView('swipe')} />
        <NavButton active={view === 'recipes'} icon={<PlusCircle />} label="Rezepte" onClick={() => setView('recipes')} />
      </nav>

      {/* Add Recipe Modal */}
      <AnimatePresence>
        {isAddingRecipe && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 pb-10 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black text-gray-900 italic">NEUES REZEPT</h3>
                <button onClick={() => setIsAddingRecipe(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddRecipe} className="space-y-6">
                <div onClick={() => fileInputRef.current?.click()} className="w-full h-40 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer overflow-hidden relative">
                  {newRecipe.imageData ? <img src={newRecipe.imageData} className="w-full h-full object-cover" alt="Preview" /> : <Upload className="text-gray-300" size={32} />}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />
                </div>
                <input required value={newRecipe.title} onChange={e => setNewRecipe({...newRecipe, title: e.target.value})} placeholder="Titel des Gerichts" className="w-full bg-gray-50 p-4 rounded-2xl outline-none" />
                <textarea required value={newRecipe.content} onChange={e => setNewRecipe({...newRecipe, content: e.target.value})} placeholder="Rezept & Zutaten" rows={4} className="w-full bg-gray-50 p-4 rounded-2xl outline-none resize-none" />
                <button type="submit" disabled={isLoading} className="w-full bg-gray-900 text-white font-bold py-5 rounded-2xl flex items-center justify-center gap-2">
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <><Plus size={20} /> Speichern</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentMatch && (
          <MatchCelebration recipe={currentMatch} user={currentUser} partner={MOCK_USERS[1]} onClose={() => setCurrentMatch(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

interface NavButtonProps {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-orange-600 scale-105' : 'text-gray-400'}`}>
    <div className={`${active ? 'bg-orange-600 text-white shadow-lg' : ''} p-2.5 rounded-2xl transition-all`}>
      {React.cloneElement(icon as React.ReactElement, { size: 22 })}
    </div>
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;

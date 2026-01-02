
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Recipe, Swipe, Match } from './types';
import { supabase } from './lib/supabase';
import { INITIAL_RECIPES } from './lib/mockData';
import SwipeCard from './components/SwipeCard';
import RecipeForm from './components/RecipeForm';
import MatchCelebration from './components/MatchCelebration';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  PlusCircle, 
  ChefHat, 
  CheckCircle2,
  UtensilsCrossed,
  Heart,
  Plus,
  Loader2,
  User as UserIcon,
  Copy,
  Check,
  LucideIcon,
  BookOpen
} from 'lucide-react';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string>(() => localStorage.getItem('dm_user_id') || '');
  const [partnerId, setPartnerId] = useState<string>(() => localStorage.getItem('dm_partner_id') || '');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('dm_user_name') || 'Ich');
  
  const [allRecipes, setAllRecipes] = useState<Recipe[]>(() => {
    const saved = localStorage.getItem('dm_local_recipes');
    return saved ? JSON.parse(saved) : INITIAL_RECIPES;
  });
  
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Recipe | null>(null);
  const [view, setView] = useState<'home' | 'swipe' | 'recipes' | 'profile'>('home');
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userId) {
      const newId = (typeof crypto !== 'undefined' && crypto.randomUUID) 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      setUserId(newId);
      localStorage.setItem('dm_user_id', newId);
    }
  }, [userId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        const { data: recipesData, error: recipeError } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false });

        if (!recipeError && recipesData && recipesData.length > 0) {
          const formattedRecipes = recipesData.map(r => ({
            id: r.id, 
            title: r.title, 
            recipeText: r.content || r.recipeText || '', 
            imageUrl: r.image_url || r.imageUrl || '', 
            createdBy: r.created_by || r.createdBy || ''
          }));
          setAllRecipes(formattedRecipes);
          localStorage.setItem('dm_local_recipes', JSON.stringify(formattedRecipes));
        }

        if (userId) {
          const { data: swipesData } = await supabase.from('swipes').select('*').eq('day', today).eq('user_id', userId);
          if (swipesData) setSwipes(swipesData);
        }
      } catch (err) {
        console.error("Daten konnten nicht von Cloud geladen werden, nutze Lokalspeicher.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    if (partnerId) {
      const channel = (supabase as any).channel('swipes_realtime')
        .on('postgres_changes', { event: 'INSERT', table: 'swipes' }, async (payload: any) => {
          const newSwipe = payload.new;
          if (newSwipe.user_id === partnerId && newSwipe.type === 'like' && newSwipe.day === today) {
            const { data: mySwipe } = await supabase.from('swipes').select('*').eq('user_id', userId).eq('recipe_id', newSwipe.recipe_id).eq('day', today).eq('type', 'like').single();
            if (mySwipe) {
              const matchedRecipe = allRecipes.find(r => r.id === newSwipe.recipe_id);
              if (matchedRecipe) setCurrentMatch(matchedRecipe);
            }
          }
        }).subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [userId, partnerId, today]);

  const hasSwipedToday = useMemo(() => swipes.some(s => (s as any).user_id === userId), [swipes, userId]);
  
  const dailyRecipe = useMemo(() => {
    if (allRecipes.length === 0) return null;
    const dayInt = new Date().getDate();
    const dayIndex = dayInt % allRecipes.length;
    return allRecipes[dayIndex];
  }, [allRecipes]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!dailyRecipe || !userId) return;
    const type = direction === 'right' ? 'like' : 'dislike';
    
    setSwipes(prev => [...prev, { id: 'temp-' + Date.now(), user_id: userId, recipe_id: dailyRecipe.id, type, day: today } as any]);
    
    try {
      await supabase.from('swipes').insert({ user_id: userId, recipe_id: dailyRecipe.id, type, day: today });
    } catch (e) {
      console.warn("Swipe nur lokal gespeichert.");
    }
  }, [userId, dailyRecipe, today]);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdBy'>) => {
    const newId = Math.random().toString(36).substring(7) + Date.now().toString(36).substring(4);
    const newRecipe: Recipe = {
      ...recipeData,
      id: newId,
      createdBy: userId
    };

    try {
      // 1. Lokaler Zustand zuerst
      const updatedRecipes = [newRecipe, ...allRecipes];
      
      // Versuche localStorage (kann bei zu großen Bildern trotzdem scheitern)
      try {
        localStorage.setItem('dm_local_recipes', JSON.stringify(updatedRecipes));
      } catch (storageError) {
        console.error("LocalStorage Limit erreicht, Rezept wird nur im Speicher gehalten.");
      }

      setAllRecipes(updatedRecipes);
      setIsAddingRecipe(false);
      setView('recipes'); // Sicherstellen, dass wir zur Liste zurückkehren

      // 2. Cloud-Backup im Hintergrund
      await supabase.from('recipes').insert({
        id: newId,
        title: recipeData.title,
        content: recipeData.recipeText,
        image_url: recipeData.imageUrl,
        created_by: userId
      });

    } catch (e) {
      console.error("Konnte Rezept nicht vollständig synchronisieren:", e);
    }
  };

  const copyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('dm_partner_id', partnerId);
    localStorage.setItem('dm_user_name', userName);
    alert("Profil gespeichert!");
    setView('home');
  };

  if (isLoading && allRecipes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfcfb]">
        <Loader2 className="animate-spin text-orange-600" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfcfb] flex flex-col relative overflow-hidden shadow-2xl border-x border-gray-100">
      <header className="px-6 py-8 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-30">
        <div onClick={() => setView('home')} className="cursor-pointer">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            DinnerMatch <UtensilsCrossed className="text-orange-500" size={24} />
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            {partnerId ? `Verbunden` : `Single-Modus`}
          </p>
        </div>
        <div 
          onClick={() => setView('profile')}
          className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border-2 border-white shadow-sm uppercase cursor-pointer"
        >
          {userName ? userName[0] : '?'}
        </div>
      </header>

      <main className="flex-grow px-6 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-orange-100/50 border border-orange-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6"><ChefHat className="text-orange-200" size={40} /></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Daily Match</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">Was gibt's heute Gutes?</p>
                {!hasSwipedToday ? (
                  <button onClick={() => setView('swipe')} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-orange-700">Vorschlag ansehen</button>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                    <span className="text-emerald-900 font-bold">Wahl getroffen!</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-gray-900 text-lg">Eure Matches</h3>
                </div>
                {matches.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <Heart className="mx-auto text-gray-200 mb-3" size={40} />
                    <p className="text-gray-400 text-sm font-medium px-10">Noch keine Matches heute.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {matches.map((match, idx) => {
                      const recipe = allRecipes.find(r => r.id === match.recipeId);
                      return (
                        <div key={idx} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100">
                          <img src={recipe?.imageUrl} className="w-full h-24 object-cover rounded-xl mb-2" alt={recipe?.title} />
                          <p className="font-bold text-xs text-gray-800 truncate">{recipe?.title}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'swipe' && (
            <motion.div key="swipe" className="h-[65vh] relative mt-4">
              {hasSwipedToday ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="bg-orange-100 p-6 rounded-full text-orange-600"><CheckCircle2 size={48} /></div>
                  <h2 className="text-2xl font-bold">Bis morgen!</h2>
                  <p className="text-gray-500 max-w-[200px]">Du hast deine heutige Entscheidung bereits getroffen.</p>
                  <button onClick={() => setView('home')} className="mt-4 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold">Dashboard</button>
                </div>
              ) : dailyRecipe ? (
                <SwipeCard recipe={dailyRecipe} onSwipe={handleSwipe} isTop={true} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6 px-10">
                  <div className="bg-gray-100 p-8 rounded-[3rem]">
                    <BookOpen className="text-gray-300 mx-auto mb-4" size={64} />
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Keine Rezepte</h2>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      Füge zuerst Rezepte in deiner Bibliothek hinzu, um mit dem Swipen zu beginnen!
                    </p>
                  </div>
                  <button 
                    onClick={() => setView('recipes')} 
                    className="bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all"
                  >
                    Zur Bibliothek
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'recipes' && (
            <motion.div key="recipes" className="space-y-6 pt-4">
              <AnimatePresence mode="wait">
                {isAddingRecipe ? (
                  <RecipeForm key="form" onSave={handleSaveRecipe} onCancel={() => setIsAddingRecipe(false)} />
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-4 rounded-[2rem] border border-gray-100">
                      <h2 className="text-2xl font-bold text-gray-900 px-2">Bibliothek</h2>
                      <button 
                        onClick={() => setIsAddingRecipe(true)}
                        className="bg-orange-600 text-white p-3 rounded-full shadow-lg shadow-orange-100 hover:bg-orange-700 transition-colors"
                      >
                        <Plus size={24} />
                      </button>
                    </div>

                    <div className="space-y-4 pb-10">
                      {allRecipes.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                          <PlusCircle className="mx-auto text-gray-200 mb-3" size={40} />
                          <p className="text-gray-400 text-sm">Füge dein erstes Rezept hinzu!</p>
                        </div>
                      ) : (
                        allRecipes.map(r => (
                          <div key={r.id} className="flex gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="relative w-24 h-24 flex-shrink-0">
                              <img src={r.imageUrl} className="w-full h-full rounded-2xl object-cover" />
                              <div className="absolute inset-0 bg-black/5 rounded-2xl group-hover:bg-transparent transition-colors" />
                            </div>
                            <div className="flex-grow overflow-hidden flex flex-col justify-center">
                              <h4 className="font-bold text-gray-900 truncate text-lg">{r.title}</h4>
                              <p className="text-xs text-gray-500 line-clamp-2 mt-1 leading-relaxed italic">{r.recipeText}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profil</h2>
                <form onSubmit={saveProfile} className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Dein Name</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Deine ID</label>
                    <div className="flex gap-2">
                      <input readOnly value={userId} className="flex-grow bg-gray-100 p-4 rounded-2xl text-[10px] font-mono border-none outline-none" />
                      <button type="button" onClick={copyId} className="bg-white border border-gray-200 p-4 rounded-2xl">
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Partner ID</label>
                    <input value={partnerId} onChange={e => setPartnerId(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 font-mono text-[10px]" placeholder="Hier Partner-ID einfügen" />
                  </div>
                  <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl">Speichern</button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-5 flex justify-between items-center z-40">
        <NavButton active={view === 'home'} icon={ChefHat} label="Home" onClick={() => setView('home')} />
        <NavButton active={view === 'swipe'} icon={UtensilsCrossed} label="Swipe" onClick={() => setView('swipe')} />
        <NavButton active={view === 'recipes'} icon={PlusCircle} label="Rezepte" onClick={() => setView('recipes')} />
        <NavButton active={view === 'profile'} icon={UserIcon} label="Profil" onClick={() => setView('profile')} />
      </nav>

      <AnimatePresence>
        {currentMatch && (
          <MatchCelebration 
            recipe={currentMatch} 
            user={{id: userId, name: userName, partnerId: partnerId, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} as any} 
            partner={{name: "Partner", avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`} as any} 
            onClose={() => setCurrentMatch(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, icon: LucideIcon, label: string, onClick: () => void}> = ({ active, icon: Icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-orange-600' : 'text-gray-400'}`}>
    <div className={`p-2 rounded-xl transition-colors ${active ? 'bg-orange-100' : ''}`}>
      <Icon size={20} />
    </div>
    <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
  </button>
);

export default App;


import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Recipe, User, Swipe, Match } from './types';
import { supabase } from './lib/supabase';
import SwipeCard from './components/SwipeCard';
import MatchCelebration from './components/MatchCelebration';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  PlusCircle, 
  ChefHat, 
  Calendar, 
  CheckCircle2,
  UtensilsCrossed,
  Heart,
  X,
  Plus,
  Upload,
  Loader2,
  User as UserIcon,
  Copy,
  Check
} from 'lucide-react';

const App: React.FC = () => {
  // State für den aktuellen User (wird aus Supabase oder LocalStorage geladen)
  const [userId, setUserId] = useState<string>(localStorage.getItem('dm_user_id') || '');
  const [partnerId, setPartnerId] = useState<string>(localStorage.getItem('dm_partner_id') || '');
  const [userName, setUserName] = useState<string>(localStorage.getItem('dm_user_name') || 'Ich');
  
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Recipe | null>(null);
  const [view, setView] = useState<'home' | 'swipe' | 'recipes' | 'profile'>('home');
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [newRecipe, setNewRecipe] = useState({ title: '', content: '', imageData: '' });
  const today = new Date().toISOString().split('T')[0];

  // Initialisierung: Eigene ID generieren, falls keine vorhanden (für Demo ohne Auth)
  useEffect(() => {
    if (!userId) {
      const newId = crypto.randomUUID();
      setUserId(newId);
      localStorage.setItem('dm_user_id', newId);
    }
  }, [userId]);

  // Daten laden
  useEffect(() => {
    const fetchData = async () => {
      if (!userId) return;
      setIsLoading(true);
      
      const { data: recipesData } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
      if (recipesData) {
        setAllRecipes(recipesData.map(r => ({
          id: r.id, title: r.title, description: r.content, ingredients: [], imageUrl: r.image_url, createdBy: r.created_by
        })));
      }

      const { data: swipesData } = await supabase.from('swipes').select('*').eq('day', today).eq('user_id', userId);
      if (swipesData) setSwipes(swipesData);

      setIsLoading(false);
    };

    fetchData();

    // Realtime für Matches
    const channel = supabase.channel('swipes_realtime')
      .on('postgres_changes', { event: 'INSERT', table: 'swipes' }, async (payload) => {
        const newSwipe = payload.new;
        if (newSwipe.user_id === partnerId && newSwipe.type === 'like' && newSwipe.day === today) {
          const { data: mySwipe } = await supabase.from('swipes').select('*').eq('user_id', userId).eq('recipe_id', newSwipe.recipe_id).eq('day', today).eq('type', 'like').single();
          if (mySwipe) {
            const matchedRecipe = allRecipes.find(r => r.id === newSwipe.recipe_id);
            if (matchedRecipe) {
              setCurrentMatch(matchedRecipe);
              setMatches(prev => [...prev, { id: Math.random().toString(), recipeId: matchedRecipe.id, date: today, partnerIds: [userId, partnerId] }]);
            }
          }
        }
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, partnerId, today, allRecipes]);

  const hasSwipedToday = useMemo(() => swipes.some(s => (s as any).user_id === userId), [swipes, userId]);
  const dailyRecipe = useMemo(() => allRecipes.length > 0 ? allRecipes[new Date().getDate() % allRecipes.length] : null, [allRecipes]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!dailyRecipe || !userId) return;
    const { data, error } = await supabase.from('swipes').insert({ user_id: userId, recipe_id: dailyRecipe.id, type: direction === 'right' ? 'like' : 'dislike', day: today }).select().single();
    if (!error && data) setSwipes(prev => [...prev, data]);
  }, [userId, dailyRecipe, today]);

  const copyId = () => {
    navigator.clipboard.writeText(userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const savePartnerId = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('dm_partner_id', partnerId);
    localStorage.setItem('dm_user_name', userName);
    alert("Profil gespeichert! Ihr seid jetzt bereit für Matches.");
    setView('home');
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfcfb] flex flex-col relative overflow-hidden shadow-2xl border-x border-gray-100">
      <header className="px-6 py-8 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-30">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            DinnerMatch <UtensilsCrossed className="text-orange-500" size={24} />
          </h1>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
            {partnerId ? `Verbunden mit Partner` : `Nicht verknüpft`}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border-2 border-white shadow-sm">
          {userName[0].toUpperCase()}
        </div>
      </header>

      <main className="flex-grow px-6 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-orange-100/50 border border-orange-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6"><ChefHat className="text-orange-200" size={40} /></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Daily Match</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">Finde heraus, was ihr heute essen wollt.</p>
                {!hasSwipedToday ? (
                  <button onClick={() => setView('swipe')} disabled={!dailyRecipe} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-700 disabled:opacity-50">Vorschlag ansehen</button>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                    <span className="text-emerald-900 font-bold">Erledigt!</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Eure Matches</h3>
                {matches.length === 0 ? (
                  <div className="text-center py-16 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <Heart className="mx-auto text-gray-200 mb-3" size={40} />
                    <p className="text-gray-400 text-sm font-medium px-10">Noch keine Matches. Tauscht eure IDs im Profil-Tab aus!</p>
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

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Dein Profil</h2>
                <form onSubmit={savePartnerId} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Dein Name</label>
                    <input value={userName} onChange={e => setUserName(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl outline-none border border-transparent focus:border-orange-500" placeholder="Dein Name" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Deine ID (Schicke sie deinem Partner)</label>
                    <div className="flex gap-2">
                      <input readOnly value={userId} className="flex-grow bg-gray-100 p-4 rounded-2xl text-[10px] font-mono outline-none" />
                      <button type="button" onClick={copyId} className="bg-white border border-gray-200 p-4 rounded-2xl hover:bg-gray-50">
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} className="text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 px-1">Partner ID (Hier ID vom Partner einfügen)</label>
                    <input value={partnerId} onChange={e => setPartnerId(e.target.value)} className="w-full bg-gray-50 p-4 rounded-2xl outline-none border border-transparent focus:border-orange-500 font-mono text-[10px]" placeholder="ID deines Partners einfügen..." />
                  </div>
                  <button type="submit" className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-xl">Speichern & Verknüpfen</button>
                </form>
              </div>
            </motion.div>
          )}

          {/* ... andere Views (swipe, recipes) wie zuvor ... */}
          {view === 'swipe' && (
            <motion.div key="swipe" className="h-[65vh] relative mt-4">
              {!dailyRecipe ? <div className="text-center p-8 text-gray-400">Keine Rezepte da.</div> : hasSwipedToday ? <div className="text-center p-8"><h2 className="text-xl font-bold">Bis morgen!</h2><button onClick={() => setView('home')} className="mt-4 bg-gray-900 text-white px-8 py-3 rounded-xl">Dashboard</button></div> : <SwipeCard recipe={dailyRecipe} onSwipe={handleSwipe} isTop={true} />}
            </motion.div>
          )}

          {view === 'recipes' && (
            <motion.div key="recipes" className="space-y-6 pt-4">
              <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-gray-900">Rezepte</h2><button onClick={() => setIsAddingRecipe(true)} className="bg-orange-600 text-white p-3 rounded-2xl shadow-lg"><Plus size={24} /></button></div>
              <div className="space-y-4">{allRecipes.map(r => <div key={r.id} className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100"><img src={r.imageUrl} className="w-20 h-20 rounded-xl object-cover" /><div className="flex-grow"><h4 className="font-bold">{r.title}</h4><p className="text-xs text-gray-500 line-clamp-2">{r.description}</p></div></div>)}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/80 backdrop-blur-xl border-t border-gray-100 px-6 py-5 flex justify-between items-center z-40">
        <NavButton active={view === 'home'} icon={<ChefHat />} label="Home" onClick={() => setView('home')} />
        <NavButton active={view === 'swipe'} icon={<UtensilsCrossed />} label="Swipe" onClick={() => setView('swipe')} />
        <NavButton active={view === 'recipes'} icon={<PlusCircle />} label="Rezepte" onClick={() => setView('recipes')} />
        <NavButton active={view === 'profile'} icon={<UserIcon />} label="Profil" onClick={() => setView('profile')} />
      </nav>

      {/* Add Recipe Modal bleibt gleich... */}
      <AnimatePresence>
        {isAddingRecipe && (
          <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px]">
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-md rounded-t-[2.5rem] p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Neues Rezept</h3><button onClick={() => setIsAddingRecipe(false)}><X /></button></div>
              <form onSubmit={async (e) => {
                e.preventDefault(); setIsLoading(true);
                let url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';
                if (selectedFile) {
                  const name = `${Math.random()}.${selectedFile.name.split('.').pop()}`;
                  const { error } = await supabase.storage.from('recipe-images').upload(name, selectedFile);
                  if (!error) url = supabase.storage.from('recipe-images').getPublicUrl(name).data.publicUrl;
                }
                const { data } = await supabase.from('recipes').insert({ title: newRecipe.title, content: newRecipe.content, image_url: url, created_by: userId }).select().single();
                if (data) {
                  setAllRecipes(prev => [{ id: data.id, title: data.title, description: data.content, ingredients: [], imageUrl: data.image_url, createdBy: data.created_by }, ...prev]);
                  setIsAddingRecipe(false); setNewRecipe({ title: '', content: '', imageData: '' });
                }
                setIsLoading(false);
              }} className="space-y-4">
                <div onClick={() => fileInputRef.current?.click()} className="h-32 bg-gray-50 border-2 border-dashed rounded-xl flex items-center justify-center overflow-hidden cursor-pointer">
                  {newRecipe.imageData ? <img src={newRecipe.imageData} className="w-full h-full object-cover" /> : <Upload className="text-gray-300" />}
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { setSelectedFile(f); const r = new FileReader(); r.onloadend = () => setNewRecipe(p => ({ ...p, imageData: r.result as string })); r.readAsDataURL(f); }
                  }} />
                </div>
                <input required value={newRecipe.title} onChange={e => setNewRecipe({...newRecipe, title: e.target.value})} placeholder="Titel" className="w-full bg-gray-50 p-4 rounded-xl" />
                <textarea required value={newRecipe.content} onChange={e => setNewRecipe({...newRecipe, content: e.target.value})} placeholder="Rezept" className="w-full bg-gray-50 p-4 rounded-xl" />
                <button type="submit" disabled={isLoading} className="w-full bg-orange-600 text-white py-4 rounded-xl font-bold">{isLoading ? "Speichert..." : "Hinzufügen"}</button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentMatch && (
          <MatchCelebration recipe={currentMatch} user={{id: userId, name: userName, partnerId: partnerId, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userName}`} as any} partner={{name: "Partner", avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`} as any} onClose={() => setCurrentMatch(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, icon: any, label: string, onClick: any}> = ({ active, icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-orange-600' : 'text-gray-400'}`}>
    <div className={`${active ? 'bg-orange-100 p-2 rounded-xl' : ''}`}>{React.cloneElement(icon as React.ReactElement, { size: 20 })}</div>
    <span className="text-[9px] font-bold uppercase">{label}</span>
  </button>
);

export default App;

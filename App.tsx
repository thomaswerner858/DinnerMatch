
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Recipe, Swipe, Match, SwipeType } from './types';
import { supabase, isSupabaseConnected } from './lib/supabase';
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
  BookOpen,
  AlertCircle,
  RefreshCw,
  Globe,
  Users
} from 'lucide-react';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string>(() => localStorage.getItem('dm_user_id') || '');
  const [partnerId, setPartnerId] = useState<string>(() => localStorage.getItem('dm_partner_id') || '');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('dm_user_name') || 'Ich');
  
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [swipes, setSwipes] = useState<Swipe[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Recipe | null>(null);
  const [view, setView] = useState<'home' | 'swipe' | 'recipes' | 'profile'>('home');
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const recipesRef = useRef<Recipe[]>([]);

  useEffect(() => {
    recipesRef.current = allRecipes;
  }, [allRecipes]);

  // Initialisierung der User ID (Kurz-ID für einfaches Pairing)
  useEffect(() => {
    if (!userId) {
      const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setUserId(newId);
      localStorage.setItem('dm_user_id', newId);
    }
  }, [userId]);

  const fetchGlobalData = useCallback(async (silent = false) => {
    if (!userId) return;
    
    try {
      if (!silent) setIsLoading(true);
      
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (recipesError) throw recipesError;

      if (recipesData) {
        const formatted = recipesData.map(r => ({
          id: r.id, 
          title: r.title, 
          recipeText: r.content || r.recipeText || '', 
          imageUrl: r.image_url || r.imageUrl || '', 
          createdBy: r.created_by || r.createdBy || ''
        }));
        setAllRecipes(formatted);
      }

      const { data: swipesData, error: swipesError } = await supabase
        .from('swipes')
        .select('*')
        .eq('day', today)
        .eq('user_id', userId);
          
      if (swipesError) throw swipesError;

      if (swipesData) {
        setSwipes(swipesData.map(s => ({
          id: s.id.toString(), userId: s.user_id, recipeId: s.recipe_id, type: s.type as SwipeType, date: s.day
        })));
      }
    } catch (err: any) {
      console.error("Daten konnten nicht geladen werden:", err.message);
      // Wenn der Fehler UUID-bezogen ist, zeigen wir einen hilfreichen Hinweis
      if (err.message.includes('uuid')) {
        alert("Datenbank-Fehler: Der Datentyp in Supabase ist falsch. Bitte führe das bereitgestellte SQL-Script im Supabase Editor aus.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, today]);

  useEffect(() => {
    if (userId) {
      fetchGlobalData();
    }
  }, [fetchGlobalData, userId]);

  useEffect(() => {
    if (!isSupabaseConnected || !userId) return;

    const channel = (supabase.channel('global-sync') as any)
      .on('postgres_changes', { event: 'INSERT', table: 'recipes' }, () => {
        fetchGlobalData(true);
      })
      .on('postgres_changes', { event: 'INSERT', table: 'swipes' }, async (payload: any) => {
        const newSwipe = payload.new;
        if (newSwipe.user_id === partnerId && newSwipe.type === 'like' && newSwipe.day === today) {
          setSwipes(currentSwipes => {
            const myLike = currentSwipes.find(s => s.recipeId === newSwipe.recipe_id && s.type === 'like');
            if (myLike) {
              const matchedRecipe = recipesRef.current.find(r => r.id === newSwipe.recipe_id);
              if (matchedRecipe) setCurrentMatch(matchedRecipe);
            }
            return currentSwipes;
          });
        }
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
  }, [partnerId, today, fetchGlobalData, userId]);

  const hasSwipedToday = useMemo(() => swipes.some(s => s.userId === userId), [swipes, userId]);
  
  const dailyRecipe = useMemo(() => {
    if (allRecipes.length === 0) return null;
    const daySeed = new Date().getFullYear() * 1000 + new Date().getMonth() * 100 + new Date().getDate();
    const dayIndex = daySeed % allRecipes.length;
    return allRecipes[dayIndex];
  }, [allRecipes]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!dailyRecipe || !userId) return;
    const swipeType: SwipeType = direction === 'right' ? 'like' : 'dislike';
    
    const newLocalSwipe: Swipe = { id: 'temp-' + Date.now(), userId, recipeId: dailyRecipe.id, type: swipeType, date: today };
    setSwipes(prev => [...prev, newLocalSwipe]);
    
    const { error } = await supabase.from('swipes').insert({ 
      user_id: userId, 
      recipe_id: dailyRecipe.id, 
      type: swipeType, 
      day: today 
    });

    if (error) {
      alert("Fehler beim Speichern: " + error.message);
      return;
    }
    
    if (swipeType === 'like' && partnerId) {
      const { data: partnerLikes } = await supabase
        .from('swipes')
        .select('*')
        .eq('user_id', partnerId)
        .eq('recipe_id', dailyRecipe.id)
        .eq('type', 'like')
        .eq('day', today);
        
      if (partnerLikes && partnerLikes.length > 0) {
        setCurrentMatch(dailyRecipe);
      }
    }
  }, [userId, dailyRecipe, today, partnerId]);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdBy'>) => {
    // Für Rezepte verwenden wir eine echte UUID, da der User diese nie manuell eintippen muss
    const newId = typeof crypto.randomUUID === 'function' 
      ? crypto.randomUUID() 
      : Math.random().toString(36).substring(2) + Date.now().toString(36);

    try {
      const { error } = await supabase.from('recipes').insert({
        id: newId, 
        title: recipeData.title, 
        content: recipeData.recipeText,
        image_url: recipeData.imageUrl, 
        created_by: userId
      });

      if (error) throw error;

      setIsAddingRecipe(false);
      setView('recipes');
      fetchGlobalData(true);
    } catch (e: any) { 
      alert("Fehler beim Hochladen: " + e.message);
    }
  };

  if (isLoading && allRecipes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfcfb]">
        <Loader2 className="animate-spin text-orange-600 mb-4" size={48} />
        <p className="text-gray-400 font-bold text-xs uppercase tracking-widest text-center px-6 leading-loose">
          Synchronisation...<br/>DinnerMatch wird vorbereitet
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfcfb] flex flex-col relative overflow-hidden shadow-2xl border-x border-gray-100">
      <header className="px-6 py-6 flex justify-between items-center bg-white/70 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-50">
        <div onClick={() => setView('home')} className="cursor-pointer">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            DinnerMatch <UtensilsCrossed className="text-orange-500" size={24} />
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <Globe size={10} /> Cloud Sync Aktiv
            </p>
          </div>
        </div>
        <button 
          onClick={() => setView('profile')} 
          className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border-2 border-white shadow-sm uppercase overflow-hidden"
        >
          {userName ? userName[0] : <UserIcon size={18} />}
        </button>
      </header>

      <main className="flex-grow px-6 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-orange-100/50 border border-orange-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6"><ChefHat className="text-orange-200" size={40} /></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 text-left">Heute entscheiden</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed italic text-left">Ein Rezept, eine Wahl. Seid ihr euch einig?</p>
                
                {!hasSwipedToday ? (
                  <button 
                    onClick={() => setView('swipe')} 
                    className="w-full bg-orange-600 text-white font-bold py-5 rounded-2xl shadow-lg hover:bg-orange-700 transition-all active:scale-95"
                  >
                    Vorschlag ansehen
                  </button>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                    <span className="text-emerald-900 font-bold">Wahl getroffen!</span>
                    <p className="text-emerald-600 text-[10px] mt-1 uppercase font-bold tracking-widest italic text-center px-4">Warte auf deinen Partner...</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center px-1">
                  <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <Users size={18} className="text-orange-500" /> Community-Status
                  </h3>
                  <button onClick={() => fetchGlobalData()} className="text-gray-400 p-2 hover:text-orange-500 transition-colors">
                    <RefreshCw size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <p className="text-3xl font-black text-orange-600 leading-none">{allRecipes.length}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-2 tracking-tighter">Rezepte Gesamt</p>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-center">
                    <p className="text-3xl font-black text-emerald-500 leading-none">Live</p>
                    <p className="text-[10px] text-gray-400 uppercase font-bold mt-2 tracking-tighter">Cloud Status</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'swipe' && (
            <motion.div key="swipe" className="h-[65vh] relative mt-4">
              {hasSwipedToday ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div className="bg-orange-100 p-6 rounded-full text-orange-600 shadow-inner"><CheckCircle2 size={48} /></div>
                  <h2 className="text-2xl font-bold italic">Bis morgen!</h2>
                  <p className="text-gray-500 max-w-[200px] mx-auto">Ihr beide bekommt jeden Tag das gleiche Rezept zum Voten.</p>
                  <button onClick={() => setView('home')} className="mt-4 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg">Zum Dashboard</button>
                </div>
              ) : dailyRecipe ? (
                <SwipeCard recipe={dailyRecipe} onSwipe={handleSwipe} isTop={true} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <BookOpen className="text-gray-200" size={80} />
                  <p className="text-gray-500 font-medium italic">Noch keine Rezepte in der Cloud.</p>
                  <button onClick={() => setView('recipes')} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">Erstes Rezept hinzufügen</button>
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
                    <div className="flex justify-between items-center bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 px-1 text-left">Bibliothek</h2>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest px-1 text-left">Alle globalen Rezepte</p>
                      </div>
                      <button 
                        onClick={() => setIsAddingRecipe(true)} 
                        className="bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all active:scale-90"
                      >
                        <Plus size={24} />
                      </button>
                    </div>

                    <div className="space-y-4 pb-12">
                      {allRecipes.length === 0 && !isLoading && (
                        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                          <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
                          <p className="text-gray-400 font-medium italic text-center px-4">Die Bibliothek ist leer.<br/>Sei der Erste!</p>
                        </div>
                      )}
                      {allRecipes.map(r => (
                        <div key={r.id} className="flex gap-4 p-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                          <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border border-gray-50 bg-gray-50">
                            <img src={r.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={r.title} />
                          </div>
                          <div className="overflow-hidden flex flex-col justify-center pr-2 text-left">
                            <h4 className="font-bold text-gray-900 truncate">{r.title}</h4>
                            <p className="text-[11px] text-gray-400 line-clamp-2 mt-1 italic leading-relaxed">{r.recipeText}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900 mb-8 italic underline decoration-orange-200 decoration-4 underline-offset-8 text-left">Setup</h2>
                
                <div className="space-y-6">
                  <div className="group text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 group-focus-within:text-orange-500 transition-colors">Dein Name</label>
                    <input 
                      value={userName} 
                      onChange={e => {setUserName(e.target.value); localStorage.setItem('dm_user_name', e.target.value)}} 
                      className="w-full bg-gray-50 p-5 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 text-gray-900 font-bold" 
                    />
                  </div>

                  <div className="p-5 bg-orange-50 rounded-[2rem] border border-orange-100 relative text-left">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2">Deine ID (Für den Partner)</label>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-lg text-orange-900 tracking-tighter italic">{userId}</span>
                      <button 
                        onClick={() => {navigator.clipboard.writeText(userId); setCopied(true); setTimeout(()=>setCopied(false),2000)}} 
                        className="p-3 bg-white rounded-xl shadow-sm hover:scale-110 transition-transform text-orange-600"
                      >
                        {copied ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                      </button>
                    </div>
                  </div>

                  <div className="group text-left">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 group-focus-within:text-orange-500 transition-colors">ID deines Partners</label>
                    <input 
                      value={partnerId} 
                      onChange={e => {setPartnerId(e.target.value); localStorage.setItem('dm_partner_id', e.target.value)}} 
                      className="w-full bg-gray-50 p-5 rounded-2xl border-none outline-none font-mono text-lg font-bold text-gray-900 focus:ring-2 ring-orange-500/20 placeholder:text-gray-300" 
                      placeholder="XXXXXX" 
                    />
                    <p className="text-[9px] text-gray-400 mt-2 italic px-1">Wichtig: Trage hier die ID deines Partners ein, damit ihr Matches bekommt!</p>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-100 text-left">
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                      <p className="text-[11px] text-emerald-800 font-medium leading-relaxed italic">
                        Alle Rezepte sind global sichtbar. Sobald jemand ein neues Rezept hochlädt, landet es automatisch in der Bibliothek für alle User.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-2xl border-t border-gray-100 px-6 py-6 flex justify-between items-center z-40">
        <NavButton active={view === 'home'} icon={ChefHat} label="Start" onClick={() => setView('home')} />
        <NavButton active={view === 'swipe'} icon={UtensilsCrossed} label="Vote" onClick={() => setView('swipe')} />
        <NavButton active={view === 'recipes'} icon={PlusCircle} label="Rezepte" onClick={() => setView('recipes')} />
        <NavButton active={view === 'profile'} icon={UserIcon} label="Setup" onClick={() => setView('profile')} />
      </nav>

      <AnimatePresence>
        {currentMatch && (
          <MatchCelebration 
            recipe={currentMatch} 
            user={{id: userId, name: userName, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} as any} 
            partner={{name: "Dein Partner", avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`} as any} 
            onClose={() => setCurrentMatch(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const NavButton: React.FC<{active: boolean, icon: LucideIcon, label: string, onClick: () => void}> = ({ active, icon: Icon, label, onClick }) => (
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-orange-600 scale-110' : 'text-gray-400 hover:text-gray-600'}`}>
    <div className={`p-2.5 rounded-[1.2rem] transition-all duration-300 ${active ? 'bg-orange-100 shadow-inner border border-orange-200/50' : ''}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;

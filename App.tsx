
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Recipe, Swipe, Match } from './types';
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
  Share2,
  Download,
  AlertCircle
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
  const [syncCode, setSyncCode] = useState('');
  
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!userId) {
      const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
      setUserId(newId);
      localStorage.setItem('dm_user_id', newId);
    }
  }, [userId]);

  // Datenladen & Realtime
  useEffect(() => {
    const fetchData = async () => {
      if (!isSupabaseConnected) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const { data: recipesData } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
        if (recipesData && recipesData.length > 0) {
          const formatted = recipesData.map(r => ({
            id: r.id, 
            title: r.title, 
            recipeText: r.content || r.recipeText || '', 
            imageUrl: r.image_url || r.imageUrl || '', 
            createdBy: r.created_by || r.createdBy || ''
          }));
          setAllRecipes(formatted);
          localStorage.setItem('dm_local_recipes', JSON.stringify(formatted));
        }

        if (userId) {
          const { data: swipesData } = await supabase.from('swipes').select('*').eq('day', today).eq('user_id', userId);
          if (swipesData) setSwipes(swipesData);
        }
      } catch (err) {
        console.warn("Cloud-Sync fehlgeschlagen.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    if (isSupabaseConnected && partnerId) {
      const channel = (supabase as any).channel('swipes_realtime')
        .on('postgres_changes', { event: 'INSERT', table: 'swipes' }, async (payload: any) => {
          const newSwipe = payload.new;
          if (newSwipe.user_id === partnerId && newSwipe.type === 'like' && newSwipe.day === today) {
            const hasLiked = swipes.some(s => s.recipeId === newSwipe.recipe_id && s.type === 'like');
            if (hasLiked) {
              const matchedRecipe = allRecipes.find(r => r.id === newSwipe.recipe_id);
              if (matchedRecipe) setCurrentMatch(matchedRecipe);
            }
          }
        }).subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [userId, partnerId, today, isSupabaseConnected]);

  const hasSwipedToday = useMemo(() => swipes.some(s => (s as any).user_id === userId), [swipes, userId]);
  
  const dailyRecipe = useMemo(() => {
    if (allRecipes.length === 0) return null;
    // Verwende das Datum als Seed für die Auswahl, damit beide User am selben Tag das gleiche sehen
    const daySeed = new Date().getFullYear() * 1000 + new Date().getMonth() * 100 + new Date().getDate();
    const dayIndex = daySeed % allRecipes.length;
    return allRecipes[dayIndex];
  }, [allRecipes]);

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!dailyRecipe || !userId) return;
    const type = direction === 'right' ? 'like' : 'dislike';
    
    const newSwipe = { id: 'local-' + Date.now(), userId, recipeId: dailyRecipe.id, type, date: today };
    setSwipes(prev => [...prev, newSwipe]);
    
    if (isSupabaseConnected) {
      try {
        await supabase.from('swipes').insert({ user_id: userId, recipe_id: dailyRecipe.id, type, day: today });
      } catch (e) { console.warn("Swipe nur lokal."); }
    } else {
      // Mock Match Logik für lokalen Modus (nur zum Testen auf einem Gerät)
      if (type === 'like' && partnerId === userId) {
        setCurrentMatch(dailyRecipe);
      }
    }
  }, [userId, dailyRecipe, today, partnerId]);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdBy'>) => {
    const newId = Math.random().toString(36).substring(7);
    const newRecipe: Recipe = { ...recipeData, id: newId, createdBy: userId };
    const updatedRecipes = [newRecipe, ...allRecipes];
    
    setAllRecipes(updatedRecipes);
    localStorage.setItem('dm_local_recipes', JSON.stringify(updatedRecipes));
    setIsAddingRecipe(false);
    setView('recipes');

    if (isSupabaseConnected) {
      try {
        await supabase.from('recipes').insert({
          id: newId, title: recipeData.title, content: recipeData.recipeText,
          image_url: recipeData.imageUrl, created_by: userId
        });
      } catch (e) { console.warn("DB Insert fehlgeschlagen."); }
    }
  };

  const exportRecipes = () => {
    const code = btoa(JSON.stringify(allRecipes));
    setSyncCode(code);
    navigator.clipboard.writeText(code);
    alert("Sync-Code kopiert! Schicke ihn deinem Partner.");
  };

  const importRecipes = () => {
    try {
      const decoded = JSON.parse(atob(syncCode));
      if (Array.isArray(decoded)) {
        setAllRecipes(decoded);
        localStorage.setItem('dm_local_recipes', JSON.stringify(decoded));
        alert(`${decoded.length} Rezepte importiert!`);
        setSyncCode('');
      }
    } catch (e) {
      alert("Ungültiger Sync-Code!");
    }
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
      <header className="px-6 py-6 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-30">
        <div onClick={() => setView('home')} className="cursor-pointer">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            DinnerMatch <UtensilsCrossed className="text-orange-500" size={24} />
          </h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isSupabaseConnected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {isSupabaseConnected ? 'Cloud Sync Aktiv' : 'Lokaler Modus'}
            </p>
          </div>
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
                <h2 className="text-xl font-bold text-gray-900 mb-2">Heute entscheiden</h2>
                <p className="text-gray-500 text-sm mb-8 leading-relaxed">Was essen wir heute Abend?</p>
                {!hasSwipedToday ? (
                  <button onClick={() => setView('swipe')} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-orange-700">Vorschlag ansehen</button>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                    <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                    <span className="text-emerald-900 font-bold">Wahl getroffen!</span>
                  </div>
                )}
              </div>

              {!partnerId && (
                <div className="bg-amber-50 rounded-3xl p-6 border border-amber-100 flex gap-4">
                  <AlertCircle className="text-amber-500 flex-shrink-0" size={24} />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Kein Partner verbunden</h4>
                    <p className="text-amber-700 text-xs mt-1">Gehe zum Profil und trage die ID deines Partners ein, um Matches zu finden.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg">Eure Matches</h3>
                {matches.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200">
                    <Heart className="mx-auto text-gray-200 mb-3" size={32} />
                    <p className="text-gray-400 text-xs font-medium">Noch keine Matches heute.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {/* Liste der Matches... */}
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
                  <p className="text-gray-500 max-w-[200px]">Ihr beide bekommt jeden Tag das gleiche Rezept zum Voten.</p>
                  <button onClick={() => setView('home')} className="mt-4 bg-gray-900 text-white px-8 py-3 rounded-xl font-bold">Dashboard</button>
                </div>
              ) : dailyRecipe ? (
                <SwipeCard recipe={dailyRecipe} onSwipe={handleSwipe} isTop={true} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <BookOpen className="text-gray-200" size={80} />
                  <p className="text-gray-500">Noch keine Rezepte vorhanden.</p>
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
                      <button onClick={() => setIsAddingRecipe(true)} className="bg-orange-600 text-white p-3 rounded-full shadow-lg">
                        <Plus size={24} />
                      </button>
                    </div>

                    <div className="space-y-4 pb-10">
                      {allRecipes.map(r => (
                        <div key={r.id} className="flex gap-4 p-4 bg-white rounded-3xl border border-gray-100 shadow-sm">
                          <img src={r.imageUrl} className="w-20 h-20 rounded-2xl object-cover flex-shrink-0" />
                          <div className="overflow-hidden">
                            <h4 className="font-bold text-gray-900 truncate">{r.title}</h4>
                            <p className="text-xs text-gray-500 line-clamp-2 mt-1 italic">{r.recipeText}</p>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Profil & Sync</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Dein Name</label>
                    <input value={userName} onChange={e => {setUserName(e.target.value); localStorage.setItem('dm_user_name', e.target.value)}} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20" />
                  </div>

                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-1">Deine User-ID</label>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-orange-900">{userId}</span>
                      <button onClick={() => {navigator.clipboard.writeText(userId); setCopied(true); setTimeout(()=>setCopied(false),2000)}} className="text-orange-600">
                        {copied ? <Check size={18} /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Partner User-ID</label>
                    <input 
                      value={partnerId} 
                      onChange={e => {setPartnerId(e.target.value); localStorage.setItem('dm_partner_id', e.target.value)}} 
                      className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-mono text-sm" 
                      placeholder="ID deines Partners" 
                    />
                  </div>

                  <hr className="border-gray-100" />

                  <div className="space-y-4">
                    <h3 className="font-bold text-gray-900 text-sm">Rezepte übertragen</h3>
                    <p className="text-xs text-gray-400">Falls der Cloud-Sync nicht aktiv ist, könnt ihr eure Rezepte manuell teilen.</p>
                    
                    <button onClick={exportRecipes} className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white py-4 rounded-2xl font-bold text-sm">
                      <Share2 size={18} /> Bibliothek exportieren
                    </button>

                    <div className="space-y-2">
                      <textarea 
                        value={syncCode} 
                        onChange={e => setSyncCode(e.target.value)}
                        placeholder="Sync-Code hier einfügen..."
                        className="w-full bg-gray-50 p-4 rounded-2xl text-[10px] h-20 font-mono"
                      />
                      <button onClick={importRecipes} className="w-full flex items-center justify-center gap-2 bg-orange-600 text-white py-4 rounded-2xl font-bold text-sm">
                        <Download size={18} /> Code importieren
                      </button>
                    </div>
                  </div>
                </div>
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
            user={{id: userId, name: userName, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} as any} 
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


import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Recipe, Swipe, Match, SwipeType } from './types';
import { supabase, isSupabaseConnected } from './lib/supabase';
import SwipeCard from './components/SwipeCard';
import RecipeForm from './components/RecipeForm';
import MatchCelebration from './components/MatchCelebration';
import { AnimatePresence, motion } from 'framer-motion';
import { 
  PlusCircle, 
  ChefHat, 
  CheckCircle2,
  UtensilsCrossed,
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
  Users,
  X,
  ChevronRight,
  Heart,
  Edit2
} from 'lucide-react';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string>(() => localStorage.getItem('dm_user_id') || '');
  const [partnerId, setPartnerId] = useState<string>(() => localStorage.getItem('dm_partner_id') || '');
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('dm_user_name') || 'Ich');
  
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [allSwipesToday, setAllSwipesToday] = useState<any[]>([]);
  const [currentMatch, setCurrentMatch] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [view, setView] = useState<'home' | 'swipe' | 'recipes' | 'profile'>('home');
  const [isAddingRecipe, setIsAddingRecipe] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const recipesRef = useRef<Recipe[]>([]);

  useEffect(() => {
    recipesRef.current = allRecipes;
  }, [allRecipes]);

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
      setDbError(null);
      
      const { data: recipesData, error: recipesError } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (recipesError) throw recipesError;

      if (recipesData) {
        const formatted = recipesData.map(r => ({
          id: r.id, 
          title: r.title, 
          recipeText: r.content || '', 
          imageUrl: r.image_url || '', 
          createdBy: r.created_by || ''
        }));
        setAllRecipes(formatted);
      }

      const { data: swipesData, error: swipesError } = await supabase
        .from('swipes')
        .select('*')
        .eq('day', today);
          
      if (swipesError) throw swipesError;
      setAllSwipesToday(swipesData || []);

    } catch (err: any) {
      console.error("Sync Error:", err.message);
      if (err.message.includes('uuid')) {
        setDbError("Datenbank-Strukturfehler. Bitte SQL-Skript erneut ausführen.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, today]);

  useEffect(() => {
    if (userId) fetchGlobalData();
  }, [fetchGlobalData, userId]);

  useEffect(() => {
    if (!isSupabaseConnected || !userId) return;

    const channel = (supabase.channel('global-sync') as any)
      .on('postgres_changes', { event: 'INSERT', table: 'recipes' }, () => {
        fetchGlobalData(true);
      })
      .on('postgres_changes', { event: 'UPDATE', table: 'recipes' }, () => {
        fetchGlobalData(true);
      })
      .on('postgres_changes', { event: 'INSERT', table: 'swipes' }, async (payload: any) => {
        const newSwipe = payload.new;
        if (newSwipe.day === today) {
          setAllSwipesToday(prev => [...prev, newSwipe]);
          
          if (newSwipe.user_id === partnerId && newSwipe.type === 'like') {
            const mySwipes = allSwipesToday.filter(s => s.user_id === userId);
            const myLike = mySwipes.find(s => s.recipe_id === newSwipe.recipe_id && s.type === 'like');
            if (myLike) {
              const matchedRecipe = recipesRef.current.find(r => r.id === newSwipe.recipe_id);
              if (matchedRecipe) setCurrentMatch(matchedRecipe);
            }
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [partnerId, today, fetchGlobalData, userId, allSwipesToday]);

  const matchesToday = useMemo(() => {
    if (!partnerId) return [];
    const myLikes = allSwipesToday.filter(s => s.user_id === userId && s.type === 'like').map(s => s.recipe_id);
    const partnerLikes = allSwipesToday.filter(s => s.user_id === partnerId && s.type === 'like').map(s => s.recipe_id);
    
    const commonIds = myLikes.filter(id => partnerLikes.includes(id));
    return allRecipes.filter(r => commonIds.includes(r.id));
  }, [allSwipesToday, userId, partnerId, allRecipes]);

  const swipableRecipes = useMemo(() => {
    const swipedIds = allSwipesToday.filter(s => s.user_id === userId).map(s => s.recipe_id);
    return allRecipes.filter(r => !swipedIds.includes(r.id));
  }, [allRecipes, allSwipesToday, userId]);

  const currentSwipeRecipe = swipableRecipes[0] || null;

  const handleSwipe = useCallback(async (direction: 'left' | 'right') => {
    if (!currentSwipeRecipe || !userId) return;
    const swipeType: SwipeType = direction === 'right' ? 'like' : 'dislike';
    
    const { error } = await supabase.from('swipes').insert({ 
      user_id: userId, 
      recipe_id: currentSwipeRecipe.id, 
      type: swipeType, 
      day: today 
    });

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }
    
    if (swipeType === 'like' && partnerId) {
      const partnerLiked = allSwipesToday.some(s => 
        s.user_id === partnerId && 
        s.recipe_id === currentSwipeRecipe.id && 
        s.type === 'like'
      );
      if (partnerLiked) {
        setCurrentMatch(currentSwipeRecipe);
      }
    }
    
    fetchGlobalData(true);
  }, [userId, currentSwipeRecipe, today, partnerId, allSwipesToday, fetchGlobalData]);

  const handleSaveRecipe = async (recipeData: Omit<Recipe, 'id' | 'createdBy'>, id?: string) => {
    try {
      if (id) {
        // Update existing
        const { error } = await supabase
          .from('recipes')
          .update({
            title: recipeData.title, 
            content: recipeData.recipeText,
            image_url: recipeData.imageUrl
          })
          .eq('id', id);
        
        if (error) throw error;
      } else {
        // Insert new
        const newId = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const { error } = await supabase.from('recipes').insert({
          id: newId, 
          title: recipeData.title, 
          content: recipeData.recipeText,
          image_url: recipeData.imageUrl, 
          created_by: userId
        });
        if (error) throw error;
      }

      setIsAddingRecipe(false);
      setEditingRecipe(null);
      setView('recipes');
      fetchGlobalData(true);
    } catch (e: any) { 
      alert("Fehler: " + e.message);
    }
  };

  const startEditing = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setIsAddingRecipe(true);
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-[#fdfcfb] flex flex-col relative overflow-hidden shadow-2xl border-x border-gray-100 text-left">
      <header className="px-6 py-6 flex justify-between items-center bg-white/70 backdrop-blur-xl sticky top-0 z-30 border-b border-gray-50">
        <div onClick={() => setView('home')} className="cursor-pointer">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-1">
            DinnerMatch <UtensilsCrossed className="text-orange-500" size={24} />
          </h1>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1">
              <Globe size={10} /> Cloud Sync
            </p>
          </div>
        </div>
        <button onClick={() => setView('profile')} className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold border-2 border-white shadow-sm uppercase overflow-hidden">
          {userName ? userName[0] : <UserIcon size={18} />}
        </button>
      </header>

      {dbError && (
        <div className="mx-6 mt-2 p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2 text-rose-800 text-[10px]">
          <AlertCircle size={14} /> <p className="font-bold uppercase tracking-wider">{dbError}</p>
        </div>
      )}

      <main className="flex-grow px-6 pb-28 overflow-y-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 pt-4">
              <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-orange-100/30 border border-orange-50 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12"><ChefHat size={80} /></div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 italic">Entscheidung fällig?</h2>
                <p className="text-gray-500 text-xs mb-8 leading-relaxed italic">Noch {swipableRecipes.length} neue Vorschläge heute</p>
                {swipableRecipes.length > 0 ? (
                  <button onClick={() => setView('swipe')} className="w-full bg-orange-600 text-white font-bold py-5 rounded-[2rem] shadow-lg hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2 italic">
                    Jetzt Swipen <ChevronRight size={18} />
                  </button>
                ) : (
                  <div className="flex flex-col items-center py-6 bg-emerald-50 rounded-[2rem] border border-emerald-100 text-center">
                    <CheckCircle2 className="text-emerald-500 mb-2" size={32} />
                    <span className="text-emerald-900 font-bold">Alles erledigt!</span>
                    <p className="text-emerald-600 text-[10px] mt-1 uppercase font-bold tracking-widest italic">Bis morgen!</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2 px-1 italic">
                  <Heart size={18} className="text-rose-500 fill-rose-500" /> Eure Matches heute
                </h3>
                {matchesToday.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {matchesToday.map(match => (
                      <motion.div 
                        key={match.id} 
                        layoutId={match.id}
                        onClick={() => setSelectedRecipe(match)}
                        className="bg-white p-3 rounded-3xl border border-gray-100 shadow-sm cursor-pointer hover:shadow-md transition-shadow relative group"
                      >
                        <div className="aspect-square rounded-2xl overflow-hidden mb-3">
                          <img src={match.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={match.title} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm truncate px-1 italic">{match.title}</h4>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-50 p-8 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-center">
                    <p className="text-gray-400 text-xs font-medium italic leading-relaxed">Noch keine Übereinstimmungen.<br/>Legt los!</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {view === 'swipe' && (
            <motion.div key="swipe" className="h-[65vh] relative mt-4">
              {currentSwipeRecipe ? (
                <SwipeCard 
                  key={currentSwipeRecipe.id}
                  recipe={currentSwipeRecipe} 
                  onSwipe={handleSwipe} 
                  isTop={true} 
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                  <BookOpen className="text-gray-200" size={80} />
                  <p className="text-gray-500 font-medium italic">Das war's für heute!</p>
                  <button onClick={() => setView('home')} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg">Dashboard</button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'recipes' && (
            <motion.div key="recipes" className="space-y-6 pt-4">
              <AnimatePresence mode="wait">
                {isAddingRecipe ? (
                  <RecipeForm 
                    key="form" 
                    initialData={editingRecipe}
                    onSave={handleSaveRecipe} 
                    onCancel={() => {setIsAddingRecipe(false); setEditingRecipe(null);}} 
                  />
                ) : (
                  <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <div className="flex justify-between items-center bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 px-1 italic">Bibliothek</h2>
                        <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest px-1">Deine Sammlung ({allRecipes.length})</p>
                      </div>
                      <button onClick={() => {setEditingRecipe(null); setIsAddingRecipe(true);}} className="bg-orange-600 text-white p-4 rounded-full shadow-lg hover:bg-orange-700 transition-all active:scale-90 shadow-orange-100"><Plus size={24} /></button>
                    </div>
                    <div className="space-y-4 pb-12">
                      {allRecipes.map(r => (
                        <div 
                          key={r.id} 
                          className="flex gap-4 p-4 bg-white rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group items-center"
                        >
                          <div 
                            onClick={() => setSelectedRecipe(r)}
                            className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 cursor-pointer"
                          >
                            <img src={r.imageUrl} className="w-full h-full object-cover" alt={r.title} />
                          </div>
                          <div 
                            onClick={() => setSelectedRecipe(r)}
                            className="flex flex-col justify-center overflow-hidden flex-grow cursor-pointer"
                          >
                            <h4 className="font-bold text-gray-900 truncate italic">{r.title}</h4>
                            <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 italic">{r.recipeText}</p>
                          </div>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(r); }}
                            className="p-3 bg-gray-50 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
                          >
                            <Edit2 size={16} />
                          </button>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-8 italic underline decoration-orange-200 decoration-4 underline-offset-8 text-center">Profil-Einstellungen</h2>
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Dein Anzeigename</label>
                    <input value={userName} onChange={e => {setUserName(e.target.value); localStorage.setItem('dm_user_name', e.target.value)}} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none focus:ring-2 ring-orange-500/20 text-gray-900 font-bold italic shadow-inner" />
                  </div>
                  <div className="p-5 bg-orange-50 rounded-[2rem] border border-orange-100">
                    <label className="text-[10px] font-black text-orange-400 uppercase tracking-widest block mb-2 px-1">Deine Pairing-ID</label>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-lg text-orange-900 italic tracking-tighter">{userId}</span>
                      <button onClick={() => {navigator.clipboard.writeText(userId); setCopied(true); setTimeout(()=>setCopied(false),2000)}} className="p-2 bg-white rounded-xl shadow-sm hover:scale-105 transition-transform text-orange-600 border border-orange-100">
                        {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Partner Pairing-ID</label>
                    <input value={partnerId} onChange={e => {setPartnerId(e.target.value); localStorage.setItem('dm_partner_id', e.target.value)}} className="w-full bg-gray-50 p-4 rounded-2xl border-none outline-none font-mono text-lg font-bold text-gray-900 placeholder:text-gray-300 italic shadow-inner" placeholder="XXXXXX" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {selectedRecipe && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 backdrop-blur-sm p-4"
            onClick={() => setSelectedRecipe(null)}
          >
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md rounded-t-[3rem] p-8 max-h-[85vh] overflow-y-auto relative shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setSelectedRecipe(null)} className="absolute top-6 right-8 p-2 bg-gray-100 rounded-full text-gray-500 hover:text-gray-800 transition-colors z-10"><X size={20} /></button>
              <div className="w-full h-56 rounded-[2rem] overflow-hidden mb-6 shadow-md border border-gray-100">
                <img src={selectedRecipe.imageUrl} className="w-full h-full object-cover" alt={selectedRecipe.title} />
              </div>
              <h2 className="text-2xl font-black text-gray-900 mb-4 pr-10 italic">{selectedRecipe.title}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-orange-500 uppercase tracking-widest border-b border-orange-50 pb-2">
                  <BookOpen size={14} /> Rezeptur & Anleitung
                </div>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap pb-10 italic">
                  {selectedRecipe.recipeText}
                </p>
              </div>
              <button 
                onClick={() => { setSelectedRecipe(null); startEditing(selectedRecipe); }}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 mb-4 hover:bg-gray-800 transition-colors shadow-lg"
              >
                <Edit2 size={18} /> Bearbeiten
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-2xl border-t border-gray-100 px-6 py-6 flex justify-between items-center z-40">
        <NavButton active={view === 'home'} icon={ChefHat} label="Start" onClick={() => setView('home')} />
        <NavButton active={view === 'swipe'} icon={UtensilsCrossed} label="Vote" onClick={() => setView('swipe')} />
        <NavButton active={view === 'recipes'} icon={PlusCircle} label="Rezepte" onClick={() => setView('recipes')} />
        <NavButton active={view === 'profile'} icon={UserIcon} label="Profil" onClick={() => setView('profile')} />
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
  <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all ${active ? 'text-orange-600 scale-105' : 'text-gray-400 hover:text-gray-600'}`}>
    <div className={`p-2.5 rounded-[1.2rem] transition-all duration-300 ${active ? 'bg-orange-100 shadow-sm border border-orange-200/30' : ''}`}>
      <Icon size={22} strokeWidth={active ? 2.5 : 2} />
    </div>
    <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

export default App;

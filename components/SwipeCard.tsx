
import React from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { Recipe } from '../types';

interface SwipeCardProps {
  recipe: Recipe;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop: boolean;
}

const SwipeCard: React.FC<SwipeCardProps> = ({ recipe, onSwipe, isTop }) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-25, 25]);
  const opacity = useTransform(x, [-200, -150, 0, 150, 200], [0, 1, 1, 1, 0]);
  const likeOpacity = useTransform(x, [50, 150], [0, 1]);
  const dislikeOpacity = useTransform(x, [-50, -150], [0, 1]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipe('right');
    } else if (info.offset.x < -100) {
      onSwipe('left');
    }
  };

  if (!isTop) {
    return (
      <div className="absolute inset-0 w-full h-full bg-white rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-100">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className="w-full h-full object-cover grayscale-[0.5] opacity-30" 
        />
      </div>
    );
  }

  return (
    <motion.div
      style={{ x, rotate, opacity }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
      className="absolute inset-0 w-full h-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden cursor-grab active:cursor-grabbing border border-gray-100"
    >
      <div className="relative h-full w-full">
        <img 
          src={recipe.imageUrl} 
          alt={recipe.title} 
          className="w-full h-full object-cover pointer-events-none" 
        />
        
        {/* Gradient Overlay for Title */}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
        
        <div className="absolute bottom-8 left-8 right-8 pointer-events-none">
          <h3 className="text-3xl font-black text-white leading-tight drop-shadow-lg italic">
            {recipe.title}
          </h3>
        </div>

        {/* Swipe Indicators */}
        <motion.div 
          style={{ opacity: likeOpacity }}
          className="absolute top-12 left-10 border-4 border-emerald-500 rounded-2xl px-6 py-3 rotate-[-15deg] bg-emerald-500/10 backdrop-blur-sm"
        >
          <span className="text-emerald-500 text-4xl font-black uppercase tracking-tighter">Lecker</span>
        </motion.div>

        <motion.div 
          style={{ opacity: dislikeOpacity }}
          className="absolute top-12 right-10 border-4 border-rose-500 rounded-2xl px-6 py-3 rotate-[15deg] bg-rose-500/10 backdrop-blur-sm"
        >
          <span className="text-rose-500 text-4xl font-black uppercase tracking-tighter">Näh</span>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SwipeCard;

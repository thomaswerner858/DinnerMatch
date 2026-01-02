
export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  imageUrl: string;
  createdBy: string;
}

export interface User {
  id: string;
  name: string;
  partnerId: string;
  avatar: string;
}

export type SwipeType = 'like' | 'dislike';

export interface Swipe {
  id: string;
  userId: string;
  recipeId: string;
  type: SwipeType;
  date: string; // ISO Date YYYY-MM-DD
}

export interface Match {
  id: string;
  recipeId: string;
  date: string;
  partnerIds: string[];
}


import { Recipe, User } from '../types';

export const MOCK_USERS: User[] = [
  { id: 'user-1', name: 'Lukas', partnerId: 'user-2', avatar: 'https://picsum.photos/seed/lukas/200' },
  { id: 'user-2', name: 'Sarah', partnerId: 'user-1', avatar: 'https://picsum.photos/seed/sarah/200' }
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: '1',
    title: 'Hausgemachte Lasagne',
    description: 'Klassische italienische Lasagne mit viel Käse und Bolognese.',
    ingredients: ['Hackfleisch', 'Lasagneplatten', 'Bechamel', 'Tomatensauce', 'Mozzarella'],
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&q=80&w=800',
    createdBy: 'system'
  },
  {
    id: '2',
    title: 'Avocado Sushi Bowl',
    description: 'Frische Bowl mit Sushi-Reis, Avocado, Lachs und Edamame.',
    ingredients: ['Reis', 'Avocado', 'Lachs', 'Sojasauce', 'Edamame'],
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&q=80&w=800',
    createdBy: 'system'
  },
  {
    id: '3',
    title: 'Scharfes Thai Curry',
    description: 'Rotes Curry mit Kokosmilch, Gemüse und Hähnchen.',
    ingredients: ['Kokosmilch', 'Currypaste', 'Hähnchen', 'Paprika', 'Bambus'],
    imageUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&q=80&w=800',
    createdBy: 'system'
  },
  {
    id: '4',
    title: 'Shakshuka',
    description: 'Eier pochiert in einer würzigen Tomatensauce mit Feta.',
    ingredients: ['Eier', 'Tomaten', 'Zwiebeln', 'Kreuzkümmel', 'Feta'],
    imageUrl: 'https://images.unsplash.com/photo-1590412200988-a436bb7050a8?auto=format&fit=crop&q=80&w=800',
    createdBy: 'system'
  },
  {
    id: '5',
    title: 'Quinoa Burger',
    description: 'Vegane Burger mit hausgemachten Quinoa-Patties.',
    ingredients: ['Quinoa', 'Bohnen', 'Burger-Brötchen', 'Salat', 'Vegan-Mayo'],
    imageUrl: 'https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&q=80&w=800',
    createdBy: 'system'
  }
];

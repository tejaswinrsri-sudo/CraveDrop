import dotenv from 'dotenv';
dotenv.config();

import { MongoClient, ObjectId } from 'mongodb';
import { CHENNAI_AREAS } from '../src/config/constants';

/**
 * ============================================================================
 * CUISINE / CATEGORY -> IMAGE POOL TABLE (Auditable Deterministic Mapping)
 * ============================================================================
 * Every image is a real, high-resolution food photo on Unsplash.
 * Images are assigned deterministically: (indexWithinCuisine % pool.length)
 * so running the seed repeatedly is 100% stable and produces varied photos.
 */
const IMAGE_POOLS = {
  // South Indian / Vegetarian Tiffin
  southIndian: [
    'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=800&q=80', // Crispy Masala Dosa
    'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80', // Idli Vada Thali
    'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', // Dosa and Chutneys
    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80', // South Indian Meals
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', // Medu Vada Sambar
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80', // Ghee Pongal
  ],
  // Biryani & Hyderabadi
  biryani: [
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80', // Dum Biryani Handi
    'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80', // Mutton Biryani
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80', // Chicken Dum Biryani
    'https://images.unsplash.com/photo-1631515243349-e0cb75fb8d3a?auto=format&fit=crop&w=800&q=80', // Hyderabadi Biryani
    'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=800&q=80', // Vegetable Biryani
  ],
  // Chettinad & Tamil Non-Veg Mess
  chettinad: [
    'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80', // Chettinad Chicken Curry
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', // Pepper Chicken
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', // Mutton Chukka Fry
    'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=800&q=80', // Non-veg Virundhu
    'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80', // Parotta with Salna
  ],
  // Seafood & Coastal
  seafood: [
    'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80', // Pan-seared Meen Varuval
    'https://images.unsplash.com/photo-1559742811-822873691df8?auto=format&fit=crop&w=800&q=80', // Prawn Masala
    'https://images.unsplash.com/photo-1553659971-f01207815844?auto=format&fit=crop&w=800&q=80', // Crab Curry Roast
    'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80', // Coastal Fish Curry
  ],
  // North Indian & Tandoori
  northIndian: [
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', // Paneer Butter Masala
    'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80', // Butter Chicken
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=800&q=80', // Tandoori Naan & Dal Makhani
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80', // Tandoori Chicken Tikka
  ],
  // Cafe & Bakery & Desserts
  cafe: [
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80', // Cafe Table & Artisanal Sandwich
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', // Hot South Indian Filter Coffee
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', // Chocolate Truffle Pastry
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80', // Gourmet Sundae
  ],
  // Chinese & Pan Asian
  chinese: [
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=800&q=80', // Hakka Noodles & Fried Rice
    'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80', // Steamed Dim Sum Momos
    'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=800&q=80', // Chilli Chicken Dry
  ],
  // Dish category specific photos
  dishStartersVeg: [
    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=800&q=80', // Paneer Tikka
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', // Sambar Vada
    'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=800&q=80', // Gobi 65
  ],
  dishStartersNonVeg: [
    'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?auto=format&fit=crop&w=800&q=80', // Chicken 65
    'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=800&q=80', // Pepper Chicken
    'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80', // Mutton Sukka
  ],
  dishBeverages: [
    'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80', // Degree Filter Coffee
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80', // Cold Brew / Fresh Juice
    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=800&q=80', // Milkshake
  ],
  dishDesserts: [
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80', // Pastry
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80', // Gulab Jamun
  ],
};

function getRestaurantImage(primaryCuisine: string, indexWithinCuisine: number): string {
  const norm = primaryCuisine.toLowerCase();
  let pool = IMAGE_POOLS.southIndian;

  if (norm.includes('biryani')) pool = IMAGE_POOLS.biryani;
  else if (norm.includes('chettinad') || norm.includes('mess')) pool = IMAGE_POOLS.chettinad;
  else if (norm.includes('seafood') || norm.includes('coastal')) pool = IMAGE_POOLS.seafood;
  else if (norm.includes('north') || norm.includes('tandoori') || norm.includes('mughlai'))
    pool = IMAGE_POOLS.northIndian;
  else if (norm.includes('cafe') || norm.includes('bakery') || norm.includes('dessert'))
    pool = IMAGE_POOLS.cafe;
  else if (norm.includes('chinese') || norm.includes('asian')) pool = IMAGE_POOLS.chinese;

  return pool[indexWithinCuisine % pool.length];
}

function getDishImage(category: string, isVeg: boolean, index: number): string {
  const cat = category.toLowerCase();
  if (cat.includes('beverage') || cat.includes('coffee') || cat.includes('drink')) {
    return IMAGE_POOLS.dishBeverages[index % IMAGE_POOLS.dishBeverages.length];
  }
  if (cat.includes('dessert') || cat.includes('sweet')) {
    return IMAGE_POOLS.dishDesserts[index % IMAGE_POOLS.dishDesserts.length];
  }
  if (cat.includes('biryani') || cat.includes('rice')) {
    return IMAGE_POOLS.biryani[index % IMAGE_POOLS.biryani.length];
  }
  if (cat.includes('starter') || cat.includes('tiffin') || cat.includes('snack')) {
    const starterPool = isVeg ? IMAGE_POOLS.dishStartersVeg : IMAGE_POOLS.dishStartersNonVeg;
    return starterPool[index % starterPool.length];
  }
  // Main course
  if (isVeg) {
    return IMAGE_POOLS.southIndian[index % IMAGE_POOLS.southIndian.length];
  } else {
    return IMAGE_POOLS.chettinad[index % IMAGE_POOLS.chettinad.length];
  }
}

// 5 Restaurant Archetypes per area to ensure diversity across all 11 areas
interface ArchetypeConfig {
  type: string;
  nameSuffix: string;
  cuisines: string[];
  isVegOnly: boolean;
  costForTwo: number;
  deliveryTime: number;
  minOrder: number;
  primaryCuisine: string;
  menuTemplates: {
    name: string;
    category: string;
    price: number;
    isVeg: boolean;
    isBestseller?: boolean;
    description: string;
  }[];
}

const ARCHETYPES: ArchetypeConfig[] = [
  // 1. South Indian Vegetarian Bhavan / Tiffin
  {
    type: 'veg_bhavan',
    nameSuffix: 'Bhavan',
    cuisines: ['South Indian', 'Pure Veg', 'Tiffin'],
    isVegOnly: true,
    costForTwo: 350,
    deliveryTime: 25,
    minOrder: 120,
    primaryCuisine: 'South Indian',
    menuTemplates: [
      { name: 'Ghee Podi Masala Dosa', category: 'Tiffin & Dosa', price: 140, isVeg: true, isBestseller: true, description: 'Crispy fermented crepe smeared with aromatic spiced gun powder and pure country ghee.' },
      { name: 'Steamed Idli Sambar (2 Pcs)', category: 'Tiffin & Dosa', price: 70, isVeg: true, description: 'Pillowy soft steamed rice cakes served with bubbling drumstick sambar and two fresh chutneys.' },
      { name: 'Crispy Medu Vada (2 Pcs)', category: 'Tiffin & Dosa', price: 80, isVeg: true, isBestseller: true, description: 'Golden fried savory lentil fritters with crushed black pepper and fresh coconut pieces.' },
      { name: 'Ghee Ven Pongal', category: 'Tiffin & Dosa', price: 110, isVeg: true, description: 'Comforting mash of rice and moong lentils seasoned with roasted cashews and cumin.' },
      { name: 'South Indian Special Thali', category: 'Main Meals', price: 220, isVeg: true, isBestseller: true, description: 'Full banana leaf meal with sambar, rasam, kootu, poriyal, curd, appalam, and sweet payasam.' },
      { name: 'Poori Masala (3 Pcs)', category: 'Main Meals', price: 130, isVeg: true, description: 'Golden puffed whole-wheat pooris served with spiced mashed potato curry.' },
      { name: 'Curd Rice with Pomegranate', category: 'Main Meals', price: 110, isVeg: true, description: 'Creamy cooled yogurt rice tempered with mustard seeds, ginger, curry leaves, and ruby pom pearls.' },
      { name: 'Mini Ghee Sambar Idli (12 Pcs)', category: 'Starters', price: 120, isVeg: true, description: 'Bite-sized baby idlis soaked in rich piping hot lentil sambar and crowned with ghee.' },
      { name: 'Traditional Degree Filter Coffee', category: 'Beverages', price: 60, isVeg: true, isBestseller: true, description: 'Freshly decocted chicory-blended coffee frothed with thick country cow milk.' },
      { name: 'Hot Badam Milk', category: 'Beverages', price: 85, isVeg: true, description: 'Creamy milk enriched with ground California almonds, fragrant saffron strands, and cardamom.' },
      { name: 'Warm Ghee Gulab Jamun (2 Pcs)', category: 'Desserts', price: 90, isVeg: true, description: 'Melt-in-the-mouth caramelized khoya dumplings soaked in rose and cardamom syrup.' },
      { name: 'Elaneer Payasam', category: 'Desserts', price: 120, isVeg: true, description: 'Classic South Indian chilled dessert made with tender coconut water, pulp, and condensed milk.' },
    ],
  },
  // 2. Biryani & Kebab House
  {
    type: 'biryani_house',
    nameSuffix: 'Biryani House',
    cuisines: ['Biryani', 'Mughlai', 'Tandoori'],
    isVegOnly: false,
    costForTwo: 550,
    deliveryTime: 35,
    minOrder: 150,
    primaryCuisine: 'Biryani',
    menuTemplates: [
      { name: 'Special Ambur Chicken Dum Biryani', category: 'Biryani & Rice', price: 290, isVeg: false, isBestseller: true, description: 'Fragrant seeraga samba rice slow-cooked with tender chicken, curd, and mild spices.' },
      { name: 'Mutton Thalappakatti Biryani', category: 'Biryani & Rice', price: 380, isVeg: false, isBestseller: true, description: 'Authentic Dindigul-style seeraga samba mutton biryani packed with spicy regional aromas.' },
      { name: 'Kolkata Egg Biryani (2 Eggs)', category: 'Biryani & Rice', price: 210, isVeg: false, description: 'Long-grain basmati biryani cooked with brown spiced boiled eggs and roasted potatoes.' },
      { name: 'Hyderabadi Paneer Dum Biryani', category: 'Biryani & Rice', price: 250, isVeg: true, description: 'Basmati rice cooked in dum style with marinated paneer cubes and fried mint.' },
      { name: 'Classic Chicken 65 (Boneless)', category: 'Starters', price: 240, isVeg: false, isBestseller: true, description: 'Deep-fried chicken morsels tossed in fiery red chili powder, garlic, and fried curry leaves.' },
      { name: 'Tandoori Chicken (Half)', category: 'Starters', price: 280, isVeg: false, description: 'Clay-oven roasted chicken marinated in Kashmiri chili, hung yogurt, and mustard oil.' },
      { name: 'Crispy Veg Spring Rolls', category: 'Starters', price: 170, isVeg: true, description: 'Golden pastry skins filled with sautéed julienne cabbage, carrots, and sweet bell peppers.' },
      { name: 'Butter Chicken Masala', category: 'Main Course', price: 310, isVeg: false, description: 'Charcoal grilled chicken simmered in a velvet tomato, cashew nut, and butter gravy.' },
      { name: 'Butter Garlic Naan (2 Pcs)', category: 'Breads', price: 110, isVeg: true, description: 'Hand-stretched leavened flatbread brushed with garlic butter and fresh cilantro.' },
      { name: 'Brinjal Ennai Kathirikai Curry', category: 'Gravies', price: 140, isVeg: true, description: 'Spiced baby eggplant gravy traditionally served alongside Chennai biryanis.' },
      { name: 'Shahi Bread Halwa', category: 'Desserts', price: 110, isVeg: true, isBestseller: true, description: 'Decadent fried bread cooked in ghee, sweetened milk, cashews, and saffron.' },
      { name: 'Rose Milk Cooler', category: 'Beverages', price: 75, isVeg: true, description: 'Refreshing iced whole milk flavored with fragrant Damascus rose syrup and sweet basil seeds.' },
    ],
  },
  // 3. Chettinad & Tamil Non-Veg Mess
  {
    type: 'chettinad_mess',
    nameSuffix: 'Mess & Parotta Corner',
    cuisines: ['Chettinad', 'South Indian', 'Tamil Non-Veg'],
    isVegOnly: false,
    costForTwo: 450,
    deliveryTime: 30,
    minOrder: 130,
    primaryCuisine: 'Chettinad',
    menuTemplates: [
      { name: 'Madurai Bun Parotta (2 Pcs)', category: 'Parotta & Tiffin', price: 110, isVeg: true, isBestseller: true, description: 'Flaky, buttery layered bun parottas hand-beaten to soft crispiness, served with salna.' },
      { name: 'Chicken Kothu Parotta', category: 'Parotta & Tiffin', price: 220, isVeg: false, isBestseller: true, description: 'Shredded parotta scrambled on a hot iron tawa with spiced chicken gravy, egg, and onions.' },
      { name: 'Mutton Chukka Varuval', category: 'Starters', price: 330, isVeg: false, isBestseller: true, description: 'Tender baby mutton cubes pan-roasted in cold-pressed sesame oil, shallots, and crushed peppercorn.' },
      { name: 'Chettinad Pepper Chicken Fry', category: 'Starters', price: 250, isVeg: false, description: 'Authentic Karaikudi dry preparation spiced with stone-ground Tellicherry black pepper.' },
      { name: 'Nethili Meen Varuval (Anchovy Fry)', category: 'Starters', price: 240, isVeg: false, description: 'Crisp rava-coated anchovies spiced with shallots, chili paste, and lemon zest.' },
      { name: 'Chettinad Country Chicken Kuzhambu', category: 'Curries', price: 290, isVeg: false, description: 'Traditional Nattu Kozhi curry brewed with kalpasi, star anise, and freshly toasted coriander.' },
      { name: 'Meen Poondu Kuzhambu', category: 'Curries', price: 280, isVeg: false, description: 'Tangy tamarind and garlic fish stew made with fresh sea catch.' },
      { name: 'Chettinad Non-Veg Virundhu Meals', category: 'Main Meals', price: 260, isVeg: false, description: 'Unlimited style steamed Ponni rice with chicken salna, fish kuzhambu, mutton gravy, and rasam.' },
      { name: 'Kal Dosa with Meen Curry (2 Pcs)', category: 'Parotta & Tiffin', price: 160, isVeg: false, description: 'Thick, spongy soft dosas paired with rich tangy fisherman curry.' },
      { name: 'Karuppatti Halwa', category: 'Desserts', price: 130, isVeg: true, isBestseller: true, description: 'Traditional palm jaggery wheat halwa prepared with native Tirunelveli mountain stream water.' },
      { name: 'Jigarthanda Cooler', category: 'Beverages', price: 100, isVeg: true, isBestseller: true, description: 'Famous Madurai iced beverage made with almond gum, nannari syrup, and basundi ice cream.' },
      { name: 'Moru (Spiced Chennai Buttermilk)', category: 'Beverages', price: 50, isVeg: true, description: 'Churned yogurt flavored with crushed green chilies, ginger, asafetida, and fresh coriander.' },
    ],
  },
  // 4. North Indian & Punjabi Dhaba
  {
    type: 'north_dhaba',
    nameSuffix: 'Grand Kitchen',
    cuisines: ['North Indian', 'Tandoori', 'Punjabi'],
    isVegOnly: false,
    costForTwo: 500,
    deliveryTime: 30,
    minOrder: 140,
    primaryCuisine: 'North Indian',
    menuTemplates: [
      { name: 'Paneer Tikka Angara', category: 'Tandoor Starters', price: 230, isVeg: true, isBestseller: true, description: 'Charred cottage cheese cubes skewered with capsicum, red onion, and ajwain marinade.' },
      { name: 'Murgh Malai Tikka', category: 'Tandoor Starters', price: 290, isVeg: false, isBestseller: true, description: 'Boneless chicken chunks marinated in cashew cream, white pepper, and melted cheese.' },
      { name: 'Crispy Corn Salt & Pepper', category: 'Tandoor Starters', price: 180, isVeg: true, description: 'Sweet corn kernels wok-tossed with scallions, roasted garlic, and crushed white peppercorns.' },
      { name: 'Dal Makhani Bukhara', category: 'Main Curries', price: 210, isVeg: true, isBestseller: true, description: 'Whole black lentils slow simmered overnight with tomatoes, fresh churned butter, and cream.' },
      { name: 'Kadai Chicken', category: 'Main Curries', price: 300, isVeg: false, description: 'Chicken cooked in a thick bell pepper and tomato gravy seasoned with freshly pounded kadai masala.' },
      { name: 'Paneer Lababdar', category: 'Main Curries', price: 260, isVeg: true, description: 'Grated and cubed paneer cooked in a creamy spiced tomato gravy.' },
      { name: 'Amritsari Kulcha with Chole', category: 'Breads & Combos', price: 220, isVeg: true, description: 'Stuffed potato and onion leavened bread baked in tandoor, served with tangy Punjabi chole.' },
      { name: 'Butter Tandoori Roti (2 Pcs)', category: 'Breads & Combos', price: 60, isVeg: true, description: 'Crisp whole-wheat flatbread roasted in the clay tandoor and brushed with butter.' },
      { name: 'Jeera Pulao', category: 'Rice Specialties', price: 150, isVeg: true, description: 'Aromatic basmati rice tempered with toasted cumin seeds and pure desi ghee.' },
      { name: 'Kesari Rasmalai (2 Pcs)', category: 'Desserts', price: 130, isVeg: true, isBestseller: true, description: 'Flattened cottage cheese patties steeped in thick saffron, pistachio, and cardamom infused milk.' },
      { name: 'Sweet Punjabi Lassi', category: 'Beverages', price: 95, isVeg: true, description: 'Thick, creamy yogurt drink whipped with sugar, topped with a dollop of fresh clotted cream (malai).' },
      { name: 'Masala Chaas', category: 'Beverages', price: 65, isVeg: true, description: 'Refreshing salted churned yogurt spiced with roasted cumin powder and mint.' },
    ],
  },
  // 5. Coastal Seafood & Beach Cafe / Bakery
  {
    type: 'coastal_cafe',
    nameSuffix: 'Coastal Kitchen & Cafe',
    cuisines: ['Seafood', 'Coastal', 'Cafe'],
    isVegOnly: false,
    costForTwo: 600,
    deliveryTime: 35,
    minOrder: 150,
    primaryCuisine: 'Seafood',
    menuTemplates: [
      { name: 'Tawa Vanjaram Fish Fry (King Fish)', category: 'Seafood Starters', price: 340, isVeg: false, isBestseller: true, description: 'Thick cut vanjaram steak marinated with homemade chili masala and pan-fried on iron tawa.' },
      { name: 'Golden Crispy Butter Garlic Prawns', category: 'Seafood Starters', price: 320, isVeg: false, isBestseller: true, description: 'Fresh Bay of Bengal sea prawns sautéed in garlic infused clarified butter and herbs.' },
      { name: 'Spicy Crab Roast (Nandu Varuval)', category: 'Seafood Starters', price: 360, isVeg: false, description: 'Fresh mud crabs roasted with crushed shallots, black pepper, and curry leaves.' },
      { name: 'Madras Fish Curry with Steamed Rice', category: 'Coastal Mains', price: 290, isVeg: false, isBestseller: true, description: 'Tangy tamarind fish curry made with coconut paste, paired with hot steamed Ponni rice.' },
      { name: 'Prawn Thokku Masala', category: 'Coastal Mains', price: 320, isVeg: false, description: 'Succulent prawns cooked down in an onion-tomato reduction with regional spices.' },
      { name: 'Appam with Coconut Milk (2 Pcs)', category: 'Breads & Tiffin', price: 120, isVeg: true, description: 'Bowl-shaped fermented rice pancakes with soft spongy centers and lacy crispy edges.' },
      { name: 'Paneer Kathi Roll', category: 'Cafe Grubs', price: 160, isVeg: true, description: 'Flaky parotta wrap stuffed with tandoori paneer, sliced peppers, and mint chutney.' },
      { name: 'Chicken Club Sandwich', category: 'Cafe Grubs', price: 210, isVeg: false, description: 'Triple-decker toasted sandwich packed with shredded chicken, fried egg, lettuce, and mayo.' },
      { name: 'Dutch Chocolate Truffle Pastry', category: 'Bakery & Sweets', price: 140, isVeg: true, isBestseller: true, description: 'Rich dark Belgian chocolate ganache layered between moist chocolate sponge.' },
      { name: 'Tender Coconut Ice Cream', category: 'Bakery & Sweets', price: 120, isVeg: true, description: 'Natural ice cream churned with fresh coastal tender coconut malai.' },
      { name: 'Iced Caramel Frappe', category: 'Beverages', price: 160, isVeg: true, isBestseller: true, description: 'Blended espresso with milk, crushed ice, and sweet caramel drizzle.' },
      { name: 'Fresh Mint Lime Crusher', category: 'Beverages', price: 90, isVeg: true, description: 'Zesty fresh lime juice shaken with muddled garden mint and crushed ice.' },
    ],
  },
];

// Area-specific authentic prefix names for realism
const AREA_PREFIXES: Record<string, string[]> = {
  Ramapuram: ['Vasantha', 'Anjappar', 'Sree Balaji', 'Madurai Muniyandi', 'Marina Bay'],
  Mogappair: ['Aachi', 'Thalappakatti', 'Ganga', 'Junior Kuppanna', 'Coastal Catch'],
  'Anna Nagar': ['Sangeetha', 'Buhari', 'Karpagambal', 'Copper Chimney', 'The Madras Table'],
  'T. Nagar': ['Saravana', 'Dindigul Velu', 'Murugan Idli', 'Peshawri', 'Bayview'],
  Velachery: ['Geetham', 'Ambur Star', 'Kaaraikudi', 'Punjabi Grill', 'Sea Emperor'],
  Adyar: ['Adyar Ananda', 'Salem RR', 'Kumarakom', 'Pind Balluchi', 'Fisherman Wharf'],
  'Besant Nagar': ['Hot Chips', 'Zaitoon', 'Ponnusamy', 'Dhabba Express', 'Bessie Beach'],
  Mylapore: ['Mylai Karpagambal', 'Sukku Bhai', 'Rayar', 'Haveli', 'Coromandel'],
  Porur: ['Sri Krishna', 'Aasife', 'Kovilpatti', 'Tandoor Hut', 'Oceanic'],
  Kilpauk: ['Welcome', 'Al-Reem', 'Chettinadu Vilas', 'Urban Dhaba', 'Coastline'],
  Nungambakkam: ['Mathsya', 'Paradise', 'Pandias', 'Khyber', 'The Lighthouse'],
};

// Street lines per area
const AREA_STREETS: Record<string, string[]> = {
  Ramapuram: ['14/2 Mount Poonamallee High Road', '8 Arcot Road Extension', '22 Senthamizh Nagar Main Rd', '5 Valluvar Salai', '31 Rayala Nagar 1st Cross'],
  Mogappair: ['120 West Mogappair Road', '45 Nolambur Main Road', '88 Pari Salai, JJ Nagar', '15 Spartan Nagar', '63 Golden Colony Main Rd'],
  'Anna Nagar': ['2nd Avenue, Near Roundtana', '144 Shanthi Colony Main Rd', '77 3rd Main Road, Anna Nagar West', '12 5th Avenue, Y Block', '90 4th Main Road'],
  'T. Nagar': ['18 Pondy Bazaar, Sir Thyagaraya Rd', '40 Usman Road Near Panagal Park', '25 North Boag Road', '8 Venkatanarayana Road', '55 Bazullah Road'],
  'Velachery': ['100 Feet Bypass Road', '42 Velachery Main Road Near Phoenix Mall', '19 Vijayanagar 1st Main Rd', '78 Dhandeeswaram Nagar', '11 Taramani Link Road'],
  Adyar: ['12 Sardar Patel Road, Adyar Signal', '44 Gandhi Nagar 1st Main Rd', '79 Lattice Bridge Road (LB Road)', '21 Kasturibai Nagar 3rd Cross', '62 Indira Nagar 2nd Avenue'],
  'Besant Nagar': ['4 Elliot’s Beach Road', '18 4th Main Road, Besant Nagar', '35 6th Avenue, Near Church', '9 3rd Cross Street, Beach View', '52 2nd Avenue'],
  Mylapore: ['30 North Mada Street, Kapaleeshwarar Temple', '12 RK Mutt Road', '54 Luz Church Road', '87 Kutcheri Road', '19 Venkatesa Agraharam St'],
  Porur: ['112 Mount Poonamallee Road, Porur Junction', '49 Kundrathur Main Road', '23 Arcot Road, Porur', '7 Ramachandra Nagar', '60 Trunk Road'],
  Kilpauk: ['82 Poonamallee High Road, Kilpauk', '15 Ormes Road, Near Metro', '39 Halls Road, Kilpauk Garden', '74 Taylors Road', '28 Balfour Road'],
  Nungambakkam: ['45 Khader Nawaz Khan Road', '110 Nungambakkam High Road', '24 Sterling Road', '68 College Road, Near DPI', '8 Haddows Road 1st Street'],
};

const AREA_PINCODES: Record<string, string> = {
  Ramapuram: '600089',
  Mogappair: '600037',
  'Anna Nagar': '600040',
  'T. Nagar': '600017',
  Velachery: '600042',
  Adyar: '600020',
  'Besant Nagar': '600090',
  Mylapore: '600004',
  Porur: '600116',
  Kilpauk: '600010',
  Nungambakkam: '600034',
};

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('FATAL: MONGODB_URI is required for seeding.');
    process.exit(1);
  }

  console.log('[Seed] Connecting to MongoDB...');
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db('food_booking');

  console.log('[Seed] Wiping ONLY restaurants and menuItems collections...');
  await db.collection('restaurants').deleteMany({});
  await db.collection('menuItems').deleteMany({});
  console.log('[Seed] Previous restaurants and menu items wiped clean.');

  const restaurantsToInsert: any[] = [];
  const menuItemsToInsert: any[] = [];

  let globalRestaurantIndex = 0;
  const cuisineCounters: Record<string, number> = {};

  for (const areaName of CHENNAI_AREAS) {
    const prefixes = AREA_PREFIXES[areaName] || ['Madras', 'Royal', 'Crown', 'Heritage', 'Classic'];
    const streets = AREA_STREETS[areaName] || ['10 Main Road', '25 Cross Street', '44 High Road', '18 Park View', '88 Commercial Avenue'];
    const pincode = AREA_PINCODES[areaName] || '600001';

    for (let i = 0; i < 5; i++) {
      const archetype = ARCHETYPES[i];
      const prefix = prefixes[i % prefixes.length];
      const street = streets[i % streets.length];
      const restId = new ObjectId();

      const restName = `${prefix} ${archetype.nameSuffix}`;
      const slug = `${restName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${areaName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

      const primaryCuisine = archetype.primaryCuisine;
      cuisineCounters[primaryCuisine] = (cuisineCounters[primaryCuisine] || 0) + 1;
      const indexWithinCuisine = cuisineCounters[primaryCuisine] - 1;

      const restImage = getRestaurantImage(primaryCuisine, indexWithinCuisine);

      // Deterministic ratings between 3.8 and 4.7
      const rating = Math.round((4.0 + (globalRestaurantIndex % 8) * 0.1) * 10) / 10;
      const ratingCount = 120 + (globalRestaurantIndex * 27) % 800;

      // Closed for only 2 restaurants out of 55 to allow testing isOpen filter
      const isOpen = globalRestaurantIndex !== 7 && globalRestaurantIndex !== 23;

      const now = new Date();
      const restaurantDoc = {
        _id: restId,
        name: restName,
        slug,
        description: `Authentic ${archetype.cuisines.join(' & ')} culinary experience in the heart of ${areaName}. Fresh ingredients and signature recipes prepared daily.`,
        cuisines: archetype.cuisines,
        image: restImage,
        area: areaName,
        address: {
          line1: street,
          area: areaName,
          city: 'Chennai',
          pincode,
        },
        rating,
        ratingCount,
        isOpen,
        deliveryTime: archetype.deliveryTime,
        minOrder: archetype.minOrder,
        isVegOnly: archetype.isVegOnly,
        costForTwo: archetype.costForTwo,
        tableCapacity: 24 + ((globalRestaurantIndex % 5) * 6), // 24 to 48 capacity
        createdAt: now,
        updatedAt: now,
      };

      restaurantsToInsert.push(restaurantDoc);

      // Seed 10-12 Menu Items for this restaurant
      archetype.menuTemplates.forEach((template, mIndex) => {
        const dishImage = getDishImage(template.category, template.isVeg, mIndex);
        // Make 1 item per restaurant unavailable to test out-of-stock validation
        const isAvailable = mIndex !== 11;

        menuItemsToInsert.push({
          _id: new ObjectId(),
          restaurantId: restId,
          name: template.name,
          description: template.description,
          price: template.price,
          category: template.category,
          image: dishImage,
          isVeg: template.isVeg,
          isAvailable,
          isBestseller: !!template.isBestseller,
          createdAt: now,
          updatedAt: now,
        });
      });

      globalRestaurantIndex++;
    }
  }

  console.log(`[Seed] Inserting ${restaurantsToInsert.length} restaurants across ${CHENNAI_AREAS.length} Chennai areas...`);
  await db.collection('restaurants').insertMany(restaurantsToInsert);

  console.log(`[Seed] Inserting ${menuItemsToInsert.length} menu items...`);
  await db.collection('menuItems').insertMany(menuItemsToInsert);

  console.log('================================================================');
  console.log(`SEEDING COMPLETE!`);
  console.log(`- Restaurants seeded: ${restaurantsToInsert.length} (Expected >= 55)`);
  console.log(`- Menu items seeded: ${menuItemsToInsert.length}`);
  console.log(`- Areas covered: ${CHENNAI_AREAS.join(', ')}`);
  console.log('================================================================');

  await client.close();
}

seed().catch((err) => {
  console.error('[Seed] Error during seeding:', err);
  process.exit(1);
});

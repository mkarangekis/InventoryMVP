/**
 * Seasonal Special Generator
 *
 * Uses the bar's city, current month, and overstocked ingredients to generate
 * contextually relevant seasonal special suggestions that move inventory and
 * carry high margin. No external API required.
 */

export type Season = "spring" | "summer" | "fall" | "winter";
export type HolidayWindow =
  | "new_year"
  | "valentines"
  | "st_patrick"
  | "cinco_de_mayo"
  | "memorial_day"
  | "fourth_of_july"
  | "labor_day"
  | "halloween"
  | "thanksgiving"
  | "christmas"
  | "none";

export type SeasonalContext = {
  season: Season;
  holiday_window: HolidayWindow;
  holiday_label: string | null;
  flavor_profiles: string[];   // e.g. ["warm spices", "citrus", "tropical"]
  trending_spirits: string[];  // what people want to drink this time of year
  occasion_notes: string;      // 1-sentence flavor guidance for Claude
};

/** Get the current season for a given month (1-12) */
export function getSeason(month: number): Season {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}

/** Detect if we're within a holiday marketing window */
export function getHolidayWindow(month: number, day: number): { window: HolidayWindow; label: string | null } {
  if (month === 12 && day >= 15 || month === 1 && day <= 7) return { window: "christmas", label: "Christmas & New Year's" };
  if (month === 1 && day >= 28 || month === 2 && day <= 7) return { window: "new_year", label: "New Year's" };
  if (month === 2 && day >= 8 && day <= 18) return { window: "valentines", label: "Valentine's Day" };
  if (month === 3 && day >= 10 && day <= 20) return { window: "st_patrick", label: "St. Patrick's Day" };
  if (month === 4 && day >= 28 || month === 5 && day <= 8) return { window: "cinco_de_mayo", label: "Cinco de Mayo" };
  if (month === 5 && day >= 20 && day <= 31) return { window: "memorial_day", label: "Memorial Day Weekend" };
  if (month === 6 && day >= 28 || month === 7 && day <= 7) return { window: "fourth_of_july", label: "Fourth of July" };
  if (month === 8 && day >= 28 || month === 9 && day <= 7) return { window: "labor_day", label: "Labor Day" };
  if (month === 10 && day >= 20 && day <= 31) return { window: "halloween", label: "Halloween" };
  if (month === 11 && day >= 20 && day <= 30) return { window: "thanksgiving", label: "Thanksgiving" };
  return { window: "none", label: null };
}

const SEASON_PROFILES: Record<Season, Omit<SeasonalContext, "season" | "holiday_window" | "holiday_label">> = {
  spring: {
    flavor_profiles: ["floral", "light citrus", "fresh herbs", "elderflower", "cucumber"],
    trending_spirits: ["gin", "prosecco", "light rum", "vodka", "aperol"],
    occasion_notes: "Spring drinkers want fresh, light, and floral. Spritz-style drinks and garden herb cocktails perform well. Avoid heavy, warming spirits.",
  },
  summer: {
    flavor_profiles: ["tropical", "citrus", "watermelon", "mint", "coconut", "stone fruit"],
    trending_spirits: ["tequila", "rum", "vodka", "mezcal", "hard seltzer"],
    occasion_notes: "Summer is high volume for frozen, tropical, and tall drinks. Ice-forward presentations sell well. Tequila and rum are at peak demand.",
  },
  fall: {
    flavor_profiles: ["warm spices", "apple", "pumpkin", "cinnamon", "maple", "fig", "pear"],
    trending_spirits: ["bourbon", "rye whiskey", "apple brandy", "amaro", "dark rum"],
    occasion_notes: "Fall is whiskey and warming cocktail season. Apple and spice profiles dominate. Cozy, amber-colored drinks with garnish tell a seasonal story.",
  },
  winter: {
    flavor_profiles: ["peppermint", "dark chocolate", "cranberry", "pomegranate", "warm vanilla", "clove"],
    trending_spirits: ["bourbon", "scotch", "brandy", "dark rum", "cognac", "amaretto"],
    occasion_notes: "Winter is celebratory and warming. Holiday-themed names and presentations drive impulse orders. Rich, spirit-forward drinks with minimal dilution.",
  },
};

const HOLIDAY_FLAVOR_OVERRIDES: Partial<Record<HolidayWindow, Partial<Pick<SeasonalContext, "flavor_profiles" | "trending_spirits" | "occasion_notes">>>> = {
  valentines: {
    flavor_profiles: ["raspberry", "rose", "strawberry", "champagne", "lychee"],
    occasion_notes: "Valentine's: pink and red drinks, champagne cocktails, and romantic presentations dominate. Name-driven specials ('Love Potion', 'Heartbreaker') sell extremely well.",
  },
  st_patrick: {
    flavor_profiles: ["Irish whiskey", "mint", "green apple", "cream"],
    trending_spirits: ["irish whiskey", "irish cream", "stout beer"],
    occasion_notes: "St. Patrick's: Irish whiskey drinks, Guinness-based cocktails, and green-colored specials. High-volume night — focus on fast-to-make drinks.",
  },
  cinco_de_mayo: {
    flavor_profiles: ["lime", "mango", "chili", "tamarind", "jalapeño"],
    trending_spirits: ["tequila", "mezcal", "modelo", "corona"],
    occasion_notes: "Cinco de Mayo: Margarita variations dominate. Spicy, fruity, and frozen options all perform well. Volume night — easy to make, high margin.",
  },
  halloween: {
    flavor_profiles: ["blackberry", "dark cherry", "blood orange", "activated charcoal", "purple"],
    occasion_notes: "Halloween: dark, dramatic, visually striking cocktails. Dry ice effects and theatrical names drive photo sharing and impulse orders.",
  },
  thanksgiving: {
    flavor_profiles: ["cranberry", "apple cider", "cinnamon", "pumpkin", "pecan"],
    occasion_notes: "Thanksgiving: festive, warming, family-occasion drinks. Mocktail versions of specials important as mixed groups attend.",
  },
  christmas: {
    flavor_profiles: ["peppermint", "cranberry", "eggnog", "cinnamon", "spiced rum"],
    occasion_notes: "Christmas: highest-volume holiday window. Classic holiday drinks (Egg Nog, Mulled Wine, Hot Toddy) alongside creative specials. Gift-giving occasion — branded cocktail kits sell.",
  },
};

export function buildSeasonalContext(now = new Date()): SeasonalContext {
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const season = getSeason(month);
  const { window: holiday_window, label: holiday_label } = getHolidayWindow(month, day);

  const base = SEASON_PROFILES[season];
  const override = HOLIDAY_FLAVOR_OVERRIDES[holiday_window] ?? {};

  return {
    season,
    holiday_window,
    holiday_label,
    flavor_profiles: override.flavor_profiles ?? base.flavor_profiles,
    trending_spirits: override.trending_spirits ?? base.trending_spirits,
    occasion_notes: override.occasion_notes ?? base.occasion_notes,
  };
}

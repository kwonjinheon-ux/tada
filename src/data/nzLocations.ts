export const NZ_MAIN_LOCATIONS = [
  "Auckland", "Hamilton", "Tauranga", "Rotorua", "Taupō", "Whangārei", "Gisborne", "Napier", "Hastings", "New Plymouth", "Whanganui", "Palmerston North", "Wellington", "Nelson", "Christchurch", "Queenstown", "Dunedin", "Invercargill", "Other New Zealand",
] as const;

export type MainLocation = (typeof NZ_MAIN_LOCATIONS)[number];

export const NZ_LOCATIONS: Record<MainLocation, readonly string[]> = {
  Auckland: ["Auckland CBD", "Albany", "Birkenhead", "Browns Bay", "Glenfield", "Takapuna", "Devonport", "Henderson", "New Lynn", "Te Atatū", "Westgate", "Mt Eden", "Newmarket", "Epsom", "Onehunga", "Ellerslie", "Mt Wellington", "Howick", "Botany", "Pakuranga", "Manukau", "Papatoetoe", "Māngere", "Ōtāhuhu", "Flat Bush", "Takanini", "Papakura", "Pukekohe", "Waiheke Island", "Other Auckland"],
  Hamilton: ["Hamilton Central", "Flagstaff", "Rototuna", "Rototuna North", "Huntington", "Chartwell", "Queenwood", "Fairfield", "Claudelands", "Hillcrest", "Hamilton East", "Silverdale", "Dinsdale", "Frankton", "Nawton", "Glenview", "Melville", "Te Rapa", "Peacocke", "Other Hamilton"],
  Tauranga: ["Tauranga Central", "Mount Maunganui", "Papamoa", "Papamoa Beach", "Pyes Pa", "Bethlehem", "Otūmoetai", "Greerton", "Welcome Bay", "The Lakes", "Maungatapu", "Matua", "Gate Pā", "Hairini", "Other Tauranga"],
  Rotorua: ["Rotorua Central", "Fenton Park", "Glenholme", "Springfield", "Lynmore", "Owhata", "Ngāpuna", "Western Heights", "Koutu", "Fairy Springs", "Pukehangi", "Other Rotorua"],
  "Taupō": ["Taupō Central", "Hilltop", "Richmond Heights", "Nukuhau", "Acacia Bay", "Wharewaka", "Waipahihi", "Two Mile Bay", "Kinloch", "Other Taupō"],
  "Whangārei": ["Whangārei Central", "Kensington", "Regent", "Tikipunga", "Kamo", "Maunu", "Onerahi", "Raumanga", "Morningside", "Other Whangārei"],
  Gisborne: ["Gisborne Central", "Kaiti", "Whataupoko", "Mangapapa", "Elgin", "Te Hapara", "Lytton West", "Riverdale", "Other Gisborne"],
  Napier: ["Napier Central", "Ahuriri", "Taradale", "Greenmeadows", "Marewa", "Onekawa", "Tamatea", "Pirimai", "Bay View", "Other Napier"],
  Hastings: ["Hastings Central", "Havelock North", "Flaxmere", "Frimley", "Mahora", "Mayfair", "Akina", "Parkvale", "Clive", "Other Hastings"],
  "New Plymouth": ["New Plymouth Central", "Fitzroy", "Merrilands", "Bell Block", "Westown", "Moturoa", "Highlands Park", "Brooklands", "Spotswood", "Other New Plymouth"],
  Whanganui: ["Whanganui Central", "Gonville", "Castlecliff", "Springvale", "St Johns Hill", "Aramoho", "Tawhero", "Durie Hill", "Other Whanganui"],
  "Palmerston North": ["Palmerston North Central", "Hokowhitu", "Terrace End", "Milson", "Kelvin Grove", "Awapuni", "West End", "Highbury", "Roslyn", "Takaro", "Other Palmerston North"],
  Wellington: ["Wellington Central", "Te Aro", "Newtown", "Kilbirnie", "Miramar", "Island Bay", "Karori", "Johnsonville", "Tawa", "Lower Hutt", "Petone", "Wainuiomata", "Upper Hutt", "Porirua", "Whitby", "Paraparaumu", "Raumati", "Waikanae", "Other Wellington"],
  Nelson: ["Nelson Central", "Tāhunanui", "Stoke", "Atawhai", "The Wood", "Richmond", "Brightwater", "Wakefield", "Motueka", "Other Nelson / Tasman"],
  Christchurch: ["Christchurch Central", "Riccarton", "Upper Riccarton", "Addington", "Sydenham", "Spreydon", "Halswell", "Hornby", "Sockburn", "Ilam", "Fendalton", "Merivale", "Papanui", "St Albans", "Shirley", "Linwood", "New Brighton", "Sumner", "Cashmere", "Wigram", "Rolleston", "Rangiora", "Kaiapoi", "Other Christchurch"],
  Queenstown: ["Queenstown Central", "Frankton", "Kelvin Heights", "Fernhill", "Sunshine Bay", "Arthurs Point", "Lake Hayes", "Shotover Country", "Jack's Point", "Arrowtown", "Cromwell", "Wānaka", "Other Queenstown / Central Otago"],
  Dunedin: ["Dunedin Central", "North Dunedin", "South Dunedin", "Mornington", "Roslyn", "Māori Hill", "St Kilda", "St Clair", "Andersons Bay", "Green Island", "Mosgiel", "Port Chalmers", "Other Dunedin"],
  Invercargill: ["Invercargill Central", "Windsor", "Waikiwi", "Richmond", "Gladstone", "Georgetown", "Appleby", "Newfield", "Heidelberg", "Other Invercargill"],
  "Other New Zealand": ["Northland", "Auckland Region", "Waikato", "Bay of Plenty", "Gisborne", "Hawke's Bay", "Taranaki", "Manawatū-Whanganui", "Wellington Region", "Tasman", "Nelson Region", "Marlborough", "West Coast", "Canterbury", "Otago", "Southland", "Chatham Islands", "GPS Location Not Found"],
};

export type LocationSelection = {
  mainLocation: MainLocation;
  subLocation: string;
  locality?: string | null;
  rawSuburb?: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export function getSubLocations(mainLocation: MainLocation | ""): readonly string[] {
  return mainLocation ? NZ_LOCATIONS[mainLocation] : [];
}

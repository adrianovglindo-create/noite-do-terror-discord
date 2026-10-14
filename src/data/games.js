// Lista de jogos do evento. Para adicionar um jogo, inclua uma linha no RAW (a ordem não importa).
// O id de cada jogo é o NOME: banimentos, porcentagens e cartas ficam salvos pelo nome,
// então renomear um jogo já usado faz ele perder esses dados.
// Formato: [nome, mín. de jogadores, máx. (null = sem limite conhecido), temas, status, aviso de acesso, tamanho em GB]
// Temas: T = Terror, D = Diversão, P = Competitivo, C = Cooperativo (vazio = a confirmar)
// Status: G = Grátis, P = Hydra, V = A confirmar
export const RAW = [
["Airport Security Sucks!",2,20,"DP","P",null,3],["Alien Swarm: Reactive Drop",1,8,"C","G",null,7],
["Aliens Took My Stuff",1,4,"CD","V","Botão “Solicitar acesso” na Steam.",7],["Among Us",4,15,"DP","P",null,1.2],
["Anomaly Company",1,4,"TC","P",null,2],["Ardent Wilds",1,6,"C","V",null,15],
["Backrooms Lost Runners",1,4,"TC","P",null,6],["Backrooms: Escape Together",1,6,"TC","P",null,15],
["BAPBAP",1,8,"DP","G",null,1],["Bar after bar",1,5,"CD","V",null,5],["Barotrauma",1,16,"TC","P",null,2],
["BodyCam",4,10,"P","P",null,50],["Broke Wizards",1,6,"CD","V",null,4],["Buckshot Roulette",2,4,"TP","P",null,0.5],
["Burglin' Gnomes",1,6,"CD","P",null,7],["Bus Bound",1,4,"C","V",null,46],["Capote",1,6,"DP","P",null,1.3],
["Caveworks (Demo)",1,1,"D","G",null,4],["Chained Together",1,4,"CD","P",null,8],
["Chained Together in the Backrooms",1,4,"TC","P",null,1],["Co-op Kaiju Horror Cooking",1,4,"TCD","P",null,1.3],
["Content Warning",1,4,"TCD","P",null,4],["CRAB GAME",2,40,"DP","G",null,0.2],["Crashout Crew",1,4,"CD","P",null,1.5],
["CRYO",1,4,"TC","P",null,20],["Cry of Fear",1,4,"TC","G",null,5],["Cubic Castles",1,50,"D","G",null,0.15],
["CURE – A Hospital Simulator",1,6,"TC","P",null,5],["CUT THAT WIRE",3,4,"TDP","P",null,2],
["Dale & Dawson Stationery Supplies",4,21,"DP","P",null,2],["Darkwater (\"Darwater\")",1,4,"TC","P",null,7],
["Dark Hours: Prologue",1,4,"TC","G",null,5],["Dawson Oaks Trailer Park",2,12,"DP","V",null,5],
["Deathground",1,4,"TC","P",null,35],["Deep Rock Galactic",1,4,"C","P",null,3],["Demonologist",1,4,"TC","P",null,20],
["DEVOUR",1,4,"TC","P",null,10],["Dynamite Day",1,6,"C","V","Solicitação pela Steam; o dev também orienta procurar a equipe no Discord.",8],
["Emergency Buddies",1,4,"CD","V","Botão “Solicitar acesso” na Steam.",null],["Escape Simulator 2",1,8,"CD","P",null,20],
["First Class Trouble",4,12,"DP","P",null,20],["Fog of Life",1,2,"TC","G",null,0.16],
["Forest Escape: Last Train",1,4,"TC","P",null,6],["Forever Skies",1,4,"C","P",null,31],["FOREWARNED",1,4,"TC","P",null,14],
["Frog Jump",1,8,"DP","P",null,2],["Funnel Runners",1,8,"C","P",null,10],["Gamble With Your Friends",1,6,"CD","P",null,3],
["Ghost Janitors",1,4,"TC","P",null,6],["Go Ape Ship!",1,8,"CD","G",null,3],["Goblin Cleanup",1,4,"CD","P",null,8],
["Goblin Company",1,4,"CD","P",null,4],["GONE Fishing",1,8,"TC","P",null,6],["Goose Goose Duck",5,16,"DP","G",null,0.4],
["Grapples Galore",2,8,"DP","G",null,1],["Halloween: The Game",1,5,"TP","V",null,45],
["Happy's Humble Burger Cult",1,4,"TCD","P",null,10],["Heave Ho 2",2,4,"CD","V",null,4],
["HOLD MY WHEEL (Demo)",1,5,"TCD","G",null,5],["INSIDE JOB",1,10,"CPD","G",null,8],["Inside the Backrooms",1,4,"TC","P",null,20],
["Jackbox Party Pack (Trivia Murder Party)",1,8,"DP","P",null,1],["JUMP SPACE",1,4,"C","P",null,30],
["Just Another Night Shift",2,4,"T","P",null,6],["Keep Digging",1,8,"CD","P",null,10],["Kletka",1,6,"TC","P",null,3],
["Knights End",1,8,"TC","P",null,2],["Labyrinthine",1,8,"TC","P",null,20],["Last Man Sitting",1,4,"DCP","P",null,7],
["Last Pirates: Die Together",1,4,"TCD","P",null,5],["Left 4 Dead 2",1,8,"TC","P",null,13],["Lethal Company",1,4,"TCD","P",null,4],
["Liar's Bar",2,4,"DP","P",null,15],["Lockdown Protocol",1,16,"DP","P",null,2],["LORT",1,8,"C","P",null,4],
["MACHINE PARTY",2,4,"TDP","P",null,1],["Mama's Sleeping Angels",1,4,"TC","P",null,10],["MAZEBOUND",1,8,"TC","V",null,6],
["MECCHA CHAMELEON",2,10,"DP","V",null,3.6],["Meowgic",1,6,"CD","P",null,3.2],["MIMESIS",1,4,"TC","P",null,4],
["MOO WHO?",2,8,"DP","P",null,4],["Murky Divers",1,8,"TC","P",null,4],["Night Shippers",1,8,"TCD","P",null,2],
["Nine-Ball Roulette",2,4,"TP","P",null,2],["No Backup",1,4,"TC","P",null,20],["No More Room in Hell",1,8,"TC","G",null,10],
["Nomad Drive",1,4,"C","V",null,10],["Of Guards And Thieves",2,12,"P","G",null,0.6],["Oh Deer",1,5,"TDP","P",null,1.8],
["Omega Strikers",2,6,"P","G",null,4],["Once Human",1,50,"C","G",null,100],["Pacify",1,4,"TC","P",null,7],
["Phasmophobia",1,4,"TC","P",null,21],["Pizza Deathlivery",1,6,"TC","V",null,5],["Puck",2,12,"P","G",null,1],
["R.E.P.O.",1,6,"TCD","P",null,1],["Ready or Not",1,5,"C","P",null,60],["RISK: Global Domination",2,6,"P","G",null,1],
["Salvation Denied",1,4,"CD","G",null,15],["Scam Line",4,8,"TDP","P",null,1],["SCP: Secret Laboratory",2,40,"TP","G",null,8],
["Shady Job",1,4,"CD","V",null,10],["Shark Mart",1,4,"CD","V",null,4],["Shift At Midnight",1,3,"TC","P",null,3],
["Side Effects",1,4,"D","P",null,0.5],["Silent Breath",1,5,"TC","P",null,8],["Sker Ritual",1,4,"TC","P",null,15],
["S.O.N.A.R",1,4,"C","V",null,5],["Species: Unknown",1,4,"TC","P",null,5],["Split Happens",1,6,"CD","G",null,2],
["Stonewards",1,4,"C","V",null,5],["Storage Hunter Simulator",1,4,"C","P",null,8],["Super Animal Royale",1,64,"DP","G",null,0.9],
["Supermarket Together",1,8,"CD","G",null,7],["Sven Co-op",1,32,"C","G",null,2],["The Gold River Project",1,4,"C","P",null,62],
["The Halloway Haunting",1,4,"TC","G",null,1],["The Headliners",1,8,"TC","P",null,9],["THE ONE FISH",1,6,"CD","V",null,1],
["THE YOU QUIZ",3,8,"DP","G",null,0.3],["Thick As Thieves",1,2,"C","P",null,10],["Toribash",2,2,"P","G",null,0.5],
["Transformice",1,50,"DC","G",null,0.06],["Treasure Hunters Prologue",1,null,"TC","G",null,5],["Twisted Party",2,8,"TDP","V",null,0.5],
["Vacation Cafe Simulator",1,4,"CD","P",null,10],["VEIN",1,null,"TC","P",null,60],["Very Safe Dino Park",1,4,"CD","V","Inscrição pela Steam; depende da convocação dos desenvolvedores.",2],
["VHOLUME",1,null,"DP","P",null,10],["VISION QUENCH",1,4,"TC","V",null,2],["VOODOO FISHIN'",1,6,"TCD","P",null,5],
["Water You Doing?",1,4,"CD","P",null,4],["We Are So Cooked (Dwarven Brothers)",1,4,"CD","G",null,5],
["WE ARE SO COOKED (Mergen Studios)",1,20,"CD","G","Playtest com botão “Solicitar acesso” na Steam.",1],
["WE ARE SO DEAD",2,6,"TCD","P",null,3],["We Are So F*cked: The Last Critter Crew (Demo)",1,1,"D","G",null,1.8],
["We Gotta Go",1,4,"TCD","P",null,4],["Wheelchair Wizards",2,8,"DP","G",null,0.2],["Whisper Mountain Outbreak",1,4,"TC","P",null,1],
["wildwoods",1,4,"C","V",null,1],["WISE GUYS",2,12,"DP","P",null,2.5],["YAPYAP",1,6,"TCD","P",null,2],
["PILGRIM",1,4,"TCD","P",null,2],["Witch It",1,16,"DP","P",null,7]
];

export const GAMELIST = RAW.map(([name,min,max,themes,status,access,size])=>({
  id:name,name,min,max:max ?? (min!=null?99:null),themes:themes.split(""),status,access:access||null,size:size??null,
  key:name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}));
export const BYNAME = Object.fromEntries(GAMELIST.map(g=>[g.name,g]));

// Páginas confirmadas na Steam; os demais abrem a busca da Steam pelo nome
export const STEAM_IDS={
 "PILGRIM":2965660,"Witch It":559650,
 "Scam Line":2794590,"Capote":3345950,"WE ARE SO COOKED (Mergen Studios)":3754350,"Wheelchair Wizards":3832630,
 "Salvation Denied":4193590,"Deathground":1200770,"CUT THAT WIRE":3498650,"VHOLUME":4131730,"Funnel Runners":3712080,
 "Last Man Sitting":774291,"Meowgic":4252290,"Thick As Thieves":3341000,"WE ARE SO DEAD":4796830,"Shift At Midnight":3722330,
 "MOO WHO?":4948000,"Happy's Humble Burger Cult":3453910,"Forest Escape: Last Train":4090360,"Backrooms Lost Runners":3072120,
 "Frog Jump":3448750,"Chained Together in the Backrooms":3060170
};
export const SEARCH_TERM={
 "Darkwater (\"Darwater\")":"Darkwater","We Are So Cooked (Dwarven Brothers)":"We Are So Cooked",
 "Jackbox Party Pack (Trivia Murder Party)":"Jackbox Party Pack","We Are So F*cked: The Last Critter Crew (Demo)":"We Are So F*cked",
 "wildwoods":"Wild Woods","CURE – A Hospital Simulator":"CURE A Hospital Simulator"
};
export const CUSTOM_URL={"Fog of Life":"https://vlowoid.itch.io/"};
export function gameUrl(g){
  if(CUSTOM_URL[g.name]) return CUSTOM_URL[g.name];
  if(STEAM_IDS[g.name]) return `https://store.steampowered.com/app/${STEAM_IDS[g.name]}/`;
  const term=SEARCH_TERM[g.name]||g.name.replace(/\s*\(Demo\)\s*$/i,"");
  return "https://store.steampowered.com/search/?term="+encodeURIComponent(term);
}

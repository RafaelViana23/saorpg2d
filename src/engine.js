
import saoAssets from "./data/sao-assets.json";

export const TILE = 32;
export const rotatedSize = (asset, rotation = 0) =>
  rotation % 2 ? { w: asset.h, h: asset.w } : { w: asset.w, h: asset.h };
export function objectHitbox(asset, object = {}) {
  const size = rotatedSize(asset, object.rotation || 0);
  const box = object.hitbox || asset?.hitbox || { x: 0, y: 0, w: size.w, h: size.h };
  return {
    x: object.x + box.x,
    y: object.y + box.y,
    w: Math.min(size.w, box.w),
    h: Math.min(size.h, box.h),
  };
}
function drawRotated(ctx, asset, x, y, rotation = 0, images = {}) {
  if (!asset) return;
  const turn = ((rotation % 4) + 4) % 4,
    tw = asset.w * TILE,
    th = asset.h * TILE;
  ctx.save();
  ctx.translate(
    x + (turn === 1 ? th : turn === 2 ? tw : 0),
    y + (turn === 2 ? th : turn === 3 ? tw : 0),
  );
  ctx.rotate((turn * Math.PI) / 2);
  drawSprite(ctx, asset, 0, 0, TILE, images);
  ctx.restore();
}

const groundVariants = [
  "base",
  "edge_l",
  "edge_r",
  "edge_t",
  "edge_b",
  "corner_tl",
  "corner_tr",
  "corner_bl",
  "corner_br",
  "inner_tl",
  "inner_tr",
  "inner_bl",
  "inner_br",
];
const extraTerrain = ["transition", "bank"].flatMap((kind) =>
  ["dirt", "grass", "sand"].flatMap((material) =>
    groundVariants.map((variant) => [
      `${kind}_${material}_${variant}`,
      `${kind === "bank" ? "Barranco" : "Transição"} · ${{ dirt: "terra", grass: "grama", sand: "areia" }[material]} · ${variant === "base" ? "base" : variant.replace("edge_", "margem ").replace("corner_", "canto ").replace("inner_", "curva interna ")}`,
      1,
      1,
      "terrain",
      material === "grass"
        ? "#8edb75"
        : material === "sand"
          ? "#e7ce9b"
          : "#b68c63",
    ]),
  ),
);
const stoneWalkVariants = [
  "base",
  "edge_l",
  "edge_r",
  "edge_t",
  "edge_b",
  "corner_tl",
  "corner_tr",
  "corner_bl",
  "corner_br",
  "inner_tl",
  "inner_tr",
  "inner_bl",
  "inner_br",
];
const stoneWalkAssets = stoneWalkVariants.map((variant) => [
  `stone_walk_${variant}`,
  `Piso pedra livre · ${variant === "base" ? "base" : variant.replace("edge_", "margem ").replace("corner_", "canto ").replace("inner_", "curva interna ")}`,
  1,
  1,
  "terrain",
  "#b5aa99",
]);
const ENVIRONMENT_ATLAS = "/sprites/environment/reference-atlas.png";
// Pixel-exact source rectangles inside the atlas reconstructed from the four
// supplied reference sheets. Destination sizes remain expressed in 32px tiles.
const ENVIRONMENT_SOURCES = {
  tree: { x: 25, y: 266, w: 105, h: 136 },
  tree_medium: { x: 268, y: 275, w: 86, h: 126 },
  tree_small: { x: 443, y: 284, w: 64, h: 112 },
  pine: { x: 503, y: 264, w: 90, h: 143 },
  dead: { x: 970, y: 263, w: 90, h: 145 },
  bush: { x: 1305, y: 276, w: 84, h: 62 },
  bush_small: { x: 1317, y: 328, w: 68, h: 52 },
  flowers: { x: 1080, y: 374, w: 71, h: 67 },
  rock: { x: 1220, y: 222, w: 78, h: 70 },
  mountain: { x: 1110, y: 226, w: 120, h: 98 },
  stump: { x: 805, y: 395, w: 58, h: 60 },
  log: { x: 866, y: 389, w: 100, h: 69 },
  house: { x: 397, y: 837, w: 168, h: 148 },
  town_hall: { x: 19, y: 649, w: 357, h: 340 },
  tavern: { x: 655, y: 675, w: 166, h: 153 },
  weapons: { x: 835, y: 746, w: 171, h: 154 },
  potions: { x: 564, y: 835, w: 142, h: 151 },
  stall: { x: 1117, y: 751, w: 143, h: 122 },
  well: { x: 1004, y: 744, w: 102, h: 134 },
  fountain: { x: 1005, y: 878, w: 145, h: 115 },
  bridge_h: { x: 465, y: 567, w: 137, h: 99 },
  bridge: { x: 1386, y: 745, w: 129, h: 121 },
  cave: { x: 1374, y: 96, w: 142, h: 159 },
  ruin_altar: { x: 219, y: 415, w: 133, h: 143 },
  torch: { x: 974, y: 470, w: 55, h: 108 },
  barrel: { x: 1038, y: 570, w: 55, h: 85 },
  chest: { x: 1263, y: 478, w: 70, h: 72 },
  fence: { x: 25, y: 561, w: 132, h: 72 },
  fence_v: { x: 327, y: 558, w: 120, h: 83 },
  bench: { x: 1194, y: 884, w: 101, h: 73 },
};
// Every visually distinct sprite in the supplied atlas has its own stable id.
// Tuple: id, label, tile width, tile height, layer, source x/y/width/height.
const ATLAS_EXTRA_SPECS = [
  ["grass_flowers", "Grama com flores", 1, 1, "terrain", 25, 22, 58, 58],
  ["grass_clean", "Grama limpa", 1, 1, "terrain", 89, 22, 58, 58],
  ["grass_weeds", "Grama com ervas", 1, 1, "terrain", 153, 22, 58, 58],
  ["dirt_clean", "Terra limpa", 1, 1, "terrain", 215, 22, 58, 58],
  ["dirt_pebbles", "Terra com pedras", 1, 1, "terrain", 279, 22, 58, 58],
  ["stone_cracked", "Piso de pedra rachado", 1, 1, "terrain", 342, 22, 58, 58],
  ["stone_moss", "Piso de pedra com musgo", 1, 1, "terrain", 405, 22, 58, 58],
  ["stone_blocks", "Piso de blocos", 1, 1, "terrain", 469, 22, 58, 58],
  ["stone_steps", "Piso de degraus", 1, 1, "terrain", 533, 22, 58, 58],
  ["stone_round", "Piso de pedras redondas", 1, 1, "terrain", 598, 22, 58, 58],
  ["grass_flowers_alt", "Grama florida alternativa", 1, 1, "terrain", 25, 87, 58, 58],
  ["grass_weeds_alt", "Grama com ervas alternativa", 1, 1, "terrain", 89, 87, 58, 58],
  ["grass_dry", "Grama seca", 1, 1, "terrain", 153, 87, 58, 58],
  ["dirt_clean_alt", "Terra limpa alternativa", 1, 1, "terrain", 215, 87, 58, 58],
  ["dirt_rocks", "Terra pedregosa", 1, 1, "terrain", 279, 87, 58, 58],
  ["stone_cracked_alt", "Pedra rachada alternativa", 1, 1, "terrain", 342, 87, 58, 58],
  ["stone_moss_alt", "Pedra com musgo alternativa", 1, 1, "terrain", 405, 87, 58, 58],
  ["stone_blocks_alt", "Blocos de pedra alternativos", 1, 1, "terrain", 469, 87, 58, 58],
  ["stone_steps_alt", "Degraus alternativos", 1, 1, "terrain", 533, 87, 58, 58],
  ["stone_round_alt", "Pedras redondas alternativas", 1, 1, "terrain", 598, 87, 58, 58],
  ["water_corner_bank_tl", "Água com margem superior esquerda", 1, 1, "terrain", 670, 22, 58, 58],
  ["water_corner_bank_tr", "Água com margem superior direita", 1, 1, "terrain", 736, 22, 58, 58],
  ["water_bank_left", "Água com margem esquerda", 1, 1, "terrain", 802, 22, 58, 58],
  ["water_bank_right", "Água com margem direita", 1, 1, "terrain", 868, 22, 58, 58],
  ["waterfall_top", "Cachoeira superior", 2, 1, "terrain", 934, 22, 115, 58],
  ["water_lilies", "Água com lírios", 1, 1, "terrain", 670, 87, 58, 58],
  ["water_bank_bottom", "Água com margem inferior", 1, 1, "terrain", 736, 87, 58, 58],
  ["water_clean", "Água limpa", 1, 1, "terrain", 802, 87, 58, 58],
  ["water_lily_pad", "Água com vitória-régia", 1, 1, "terrain", 868, 87, 58, 58],
  ["waterfall_large", "Cachoeira grande", 2, 3, "structures", 933, 84, 116, 174],
  ["cliff_large", "Penhasco grande", 3, 3, "structures", 26, 151, 150, 120],
  ["cliff_tall", "Penhasco alto", 1, 3, "structures", 179, 151, 58, 123],
  ["cliff_wide", "Penhasco largo", 3, 2, "structures", 242, 151, 151, 101],
  ["cliff_slope_left", "Penhasco inclinado esquerdo", 1, 3, "structures", 399, 151, 62, 131],
  ["cliff_column", "Coluna de penhasco", 1, 3, "structures", 466, 151, 58, 127],
  ["cliff_narrow", "Penhasco estreito", 1, 3, "structures", 530, 151, 42, 128],
  ["cliff_slope_right", "Penhasco inclinado direito", 1, 3, "structures", 579, 151, 61, 126],
  ["cliff_short", "Penhasco baixo", 1, 2, "structures", 648, 151, 49, 112],
  ["cliff_block", "Bloco de penhasco", 2, 2, "structures", 704, 151, 113, 106],
  ["cliff_edge", "Borda de penhasco", 1, 2, "structures", 823, 151, 61, 111],
  ["waterfall_narrow", "Cachoeira estreita", 1, 3, "structures", 891, 151, 61, 126],
  ["cliff_vines", "Penhasco com vinhas", 1, 2, "structures", 961, 154, 62, 107],
  ["potted_tree", "Árvore em vaso", 1, 2, "decor", 1017, 171, 72, 93],
  ["plant_large", "Planta grande", 1, 1, "decor", 1081, 211, 52, 55],
  ["boulder_large", "Pedra grande", 2, 2, "decor", 1089, 151, 109, 105],
  ["bones", "Ossos", 2, 1, "decor", 1201, 174, 93, 59],
  ["rock_medium", "Pedra média", 1, 1, "decor", 1240, 237, 56, 39],
  ["rock_small", "Pedra pequena", 1, 1, "decor", 1300, 238, 53, 35],
  ["rubble", "Entulho", 1, 1, "decor", 1361, 244, 48, 29],
  ["tree_broad_dark", "Árvore larga escura", 3, 4, "decor", 132, 266, 108, 139],
  ["tree_round", "Árvore redonda", 3, 4, "decor", 365, 276, 91, 127],
  ["tree_young", "Árvore jovem", 2, 3, "decor", 602, 278, 83, 126],
  ["tree_bushy", "Árvore frondosa", 2, 3, "decor", 690, 285, 83, 118],
  ["tree_sapling", "Árvore muda", 2, 3, "decor", 781, 283, 74, 121],
  ["pine_small", "Pinheiro pequeno", 2, 3, "decor", 867, 284, 72, 120],
  ["dead_tree_large", "Árvore seca grande", 3, 4, "decor", 970, 263, 94, 145],
  ["dry_grass", "Grama seca alta", 1, 1, "decor", 1192, 276, 55, 58],
  ["mushrooms_red", "Cogumelos vermelhos", 1, 1, "decor", 1139, 342, 57, 61],
  ["flower_white", "Flores brancas", 1, 1, "decor", 1077, 355, 55, 51],
  ["plant_tall", "Planta alta", 1, 1, "decor", 1398, 346, 43, 61],
  ["fern", "Samambaia", 1, 1, "decor", 1448, 346, 44, 61],
  ["ruin_column_tall", "Coluna alta", 1, 3, "structures", 26, 416, 53, 145],
  ["ruin_column_broken", "Coluna quebrada", 1, 3, "structures", 88, 416, 55, 143],
  ["ruin_column_low", "Coluna baixa", 1, 2, "structures", 153, 454, 54, 107],
  ["ruin_wall_l", "Parede de ruína esquerda", 2, 2, "structures", 506, 416, 76, 96],
  ["ruin_wall_m", "Parede de ruína central", 2, 2, "structures", 589, 416, 76, 96],
  ["ruin_wall_r", "Parede de ruína direita", 2, 2, "structures", 674, 416, 76, 96],
  ["ruin_wall_pillar", "Pilar de ruína", 1, 2, "structures", 759, 416, 52, 97],
  ["ruin_wall_destroyed_l", "Parede destruída esquerda", 2, 2, "structures", 508, 510, 87, 74],
  ["ruin_wall_destroyed_m", "Parede destruída central", 2, 2, "structures", 604, 510, 78, 73],
  ["ruin_wall_destroyed_r", "Parede destruída direita", 2, 2, "structures", 692, 510, 79, 72],
  ["ruin_wall_tall", "Parede alta de ruína", 1, 3, "structures", 788, 489, 52, 103],
  ["ruin_corner", "Canto de ruína", 2, 2, "structures", 850, 482, 92, 95],
  ["brazier", "Braseiro", 2, 2, "decor", 1026, 458, 79, 105],
  ["banner_blue", "Bandeira azul", 1, 2, "decor", 1115, 463, 54, 98],
  ["statue_guard", "Estátua do guardião", 2, 3, "decor", 1181, 454, 79, 113],
  ["bones_small", "Ossos pequenos", 1, 1, "decor", 1341, 493, 73, 54],
  ["dead_tree_small", "Árvore seca pequena", 2, 3, "decor", 1430, 431, 76, 138],
  ["fence_broken", "Cerca quebrada", 2, 1, "decor", 164, 568, 120, 65],
  ["fence_post", "Cerca com poste", 2, 1, "decor", 292, 558, 119, 79],
  ["wood_bridge_wide", "Ponte de madeira larga", 4, 2, "structures", 465, 567, 137, 99],
  ["sign_hanging", "Placa suspensa", 1, 2, "decor", 615, 570, 71, 92],
  ["log_barrier", "Barreira de tronco", 2, 1, "decor", 693, 580, 95, 59],
  ["sign", "Placa", 1, 2, "decor", 794, 574, 61, 88],
  ["stairs_large", "Escada grande", 3, 2, "structures", 864, 566, 111, 99],
  ["crate", "Caixa", 1, 1, "decor", 984, 584, 58, 65],
  ["barrel_alt", "Barril alternativo", 1, 1, "decor", 1046, 568, 54, 82],
  ["barrel_closed", "Barril fechado", 1, 1, "decor", 1104, 574, 56, 77],
  ["hay", "Feno", 2, 1, "decor", 1167, 581, 91, 67],
  ["broken_cart", "Carroça quebrada", 3, 2, "decor", 1267, 566, 134, 92],
  ["old_book", "Livro antigo", 1, 1, "decor", 1416, 583, 89, 64],
  ["crate_side", "Caixa lateral", 1, 1, "decor", 1012, 680, 60, 55],
  ["gate", "Portão", 3, 2, "structures", 1232, 666, 128, 74],
  ["plant_pot", "Planta em vaso", 1, 1, "decor", 1372, 674, 58, 64],
  ["shrub_round", "Arbusto redondo", 1, 1, "decor", 1444, 670, 65, 68],
  ["house_blue", "Casa de telhado azul", 4, 4, "structures", 470, 704, 150, 139],
  ["house_red", "Casa de telhado vermelho", 5, 4, "structures", 650, 704, 166, 142],
  ["shop_blue", "Loja de telhado azul", 4, 4, "structures", 833, 746, 171, 154],
  ["well_roof", "Poço coberto", 2, 2, "structures", 1013, 748, 94, 123],
  ["market_red", "Mercado vermelho", 3, 3, "structures", 1117, 751, 143, 122],
  ["market_blue", "Mercado azul", 3, 3, "structures", 1262, 751, 143, 122],
  ["house_red_small", "Casa vermelha pequena", 4, 4, "structures", 397, 837, 168, 148],
  ["house_blue_small", "Casa azul pequena", 4, 4, "structures", 564, 835, 142, 151],
  ["house_red_medium", "Casa vermelha média", 4, 4, "structures", 706, 837, 142, 149],
  ["flower_box_large", "Jardineira grande", 2, 1, "decor", 824, 912, 91, 68],
  ["flower_box_small", "Jardineira pequena", 2, 1, "decor", 920, 912, 79, 67],
  ["lamp_blue", "Poste azul", 1, 3, "decor", 1147, 870, 54, 118],
  ["lamp_black", "Poste preto", 1, 3, "decor", 1298, 871, 54, 117],
  ["lamp_double", "Poste duplo", 1, 3, "decor", 1350, 865, 67, 124],
  ["signpost", "Poste de sinalização", 1, 2, "decor", 1427, 865, 77, 123],
  ["cliff_grass_tall", "Penhasco gramado alto", 1, 3, "structures", 1050, 22, 62, 126],
  ["cliff_grass_broken", "Penhasco gramado quebrado", 1, 3, "structures", 1115, 22, 65, 127],
  ["cliff_grass_round", "Penhasco gramado redondo", 1, 2, "structures", 1182, 23, 66, 94],
  ["cliff_round_high", "Penhasco redondo alto", 1, 2, "structures", 1250, 22, 65, 96],
  ["cliff_round_low", "Penhasco redondo baixo", 1, 2, "structures", 1317, 23, 65, 91],
  ["cliff_grass_wide", "Penhasco gramado largo", 2, 2, "structures", 1384, 22, 97, 97],
  ["cliff_grass_edge", "Borda gramada de penhasco", 1, 2, "structures", 1480, 22, 54, 99],
  ["cliff_grass_pillar", "Pilar gramado", 1, 3, "structures", 1052, 112, 61, 128],
  ["cliff_boulder", "Pedra de penhasco", 2, 2, "structures", 1119, 117, 82, 80],
  ["cliff_rubble_large", "Entulho grande de penhasco", 2, 1, "decor", 1207, 120, 78, 58],
  ["cliff_rubble_medium", "Entulho médio de penhasco", 1, 1, "decor", 1292, 121, 61, 52],
  ["cliff_column_round", "Coluna rochosa redonda", 1, 2, "structures", 1358, 111, 65, 91],
  ["cliff_rocks_cluster", "Conjunto de rochas", 2, 1, "decor", 1424, 114, 90, 63],
  ["bush_bright", "Arbusto verde-claro", 2, 2, "decor", 1080, 280, 83, 77],
  ["bush_dark", "Arbusto verde-escuro", 2, 2, "decor", 1247, 281, 79, 73],
  ["bush_flowered", "Arbusto florido", 2, 1, "decor", 1275, 345, 76, 60],
  ["bush_round_small", "Arbusto redondo pequeno", 1, 1, "decor", 1352, 357, 58, 51],
  ["bush_tiny", "Arbusto minúsculo", 1, 1, "decor", 1251, 399, 48, 42],
  ["plant_dry", "Planta seca", 1, 1, "decor", 1310, 403, 42, 43],
  ["flowers_yellow", "Flores amarelas", 1, 1, "decor", 1077, 402, 55, 48],
  ["flowers_red", "Flores vermelhas", 1, 1, "decor", 1138, 400, 61, 49],
  ["flowers_mixed", "Flores variadas", 1, 1, "decor", 1199, 401, 57, 49],
  ["shrub_spotted", "Arbusto com flores", 1, 1, "decor", 1370, 401, 54, 47],
  ["shrub_low", "Arbusto rasteiro", 1, 1, "decor", 1426, 401, 55, 46],
  ["stairs_small", "Escada pequena", 2, 1, "structures", 867, 520, 108, 60],
  ["torch_stone", "Tocha de pedra", 1, 2, "decor", 972, 459, 56, 108],
  ["chest_gold", "Baú dourado", 1, 1, "decor", 1261, 478, 72, 73],
  ["town_lamp_left", "Poste da prefeitura esquerdo", 1, 3, "decor", 25, 642, 57, 161],
  ["town_lamp_right", "Poste da prefeitura direito", 1, 3, "decor", 351, 642, 56, 161],
  ["bridge_vertical_large", "Ponte vertical grande", 2, 4, "structures", 1386, 745, 129, 121],
  ["bench_wood", "Banco de madeira", 2, 1, "decor", 1194, 884, 101, 73],
];
// Extra atlas cuts were removed from the library. Keep the basic curated
// sprites below and leave this list empty for old folder definitions.
const atlasExtraAssets = [];
const NATURE_EXTRA_IDS = new Set([
  "potted_tree", "plant_large", "boulder_large", "bones", "rock_medium",
  "rock_small", "rubble", "tree_broad_dark", "tree_round", "tree_young",
  "tree_bushy", "tree_sapling", "pine_small", "dead_tree_large", "dry_grass",
  "mushrooms_red", "flower_white", "plant_tall", "fern", "dead_tree_small",
  "shrub_round", "cliff_rubble_large", "cliff_rubble_medium",
  "cliff_rocks_cluster", "bush_bright", "bush_dark", "bush_flowered",
  "bush_round_small", "bush_tiny", "plant_dry", "flowers_yellow",
  "flowers_red", "flowers_mixed", "shrub_spotted", "shrub_low",
]);
export const initialAssets = [
  ...extraTerrain,
  ...stoneWalkAssets,
  [
    "stone_walk_grass_clean",
    "Pedra e grama · sem terra",
    1,
    1,
    "terrain",
    "#a7a29a",
  ],
  ["grass", "Grama", 1, 1, "terrain", "#8edb75"],
  ["dirt", "Terra", 1, 1, "terrain", "#b68c63"],
  ["path", "Caminho", 1, 1, "terrain", "#c6ad85"],
  ["stone", "Piso pedra", 1, 1, "terrain", "#b5aa99"],
  ...["t", "b", "l", "r"].map((d) => [
    "stone_edge_" + d,
    "Pedra · borda " +
      { t: "superior", b: "inferior", l: "esquerda", r: "direita" }[d],
    1,
    1,
    "terrain",
    "#b5aa99",
  ]),
  ...["tl", "tr", "bl", "br"].map((c) => [
    "stone_corner_" + c,
    "Pedra · canto " + c.toUpperCase(),
    1,
    1,
    "terrain",
    "#b5aa99",
  ]),
  ...["tl", "tr", "bl", "br"].map((c) => [
    "stone_inner_" + c,
    "Pedra · curva interna " + c.toUpperCase(),
    1,
    1,
    "terrain",
    "#b5aa99",
  ]),
  ["sand", "Areia", 1, 1, "terrain", "#e7ce9b"],
  ["snow", "Neve", 1, 1, "terrain", "#e9f2f2"],
  ["water", "Água", 1, 1, "terrain", "#39bee5"],
  ["water_edge_l", "Água · margem esquerda", 1, 1, "terrain", "#39bee5"],
  ["water_edge_r", "Água · margem direita", 1, 1, "terrain", "#39bee5"],
  ["water_edge_t", "Água · margem superior", 1, 1, "terrain", "#39bee5"],
  ["water_edge_b", "Água · margem inferior", 1, 1, "terrain", "#39bee5"],
  ...["tl", "tr", "bl", "br"].map((c) => [
    "water_corner_" + c,
    "Água · canto " + c.toUpperCase(),
    1,
    1,
    "terrain",
    "#39bee5",
  ]),
  ...["tl", "tr", "bl", "br"].map((c) => [
    "water_inner_" + c,
    "Água · curva interna " + c.toUpperCase(),
    1,
    1,
    "terrain",
    "#39bee5",
  ]),
  ["tree", "Árvore grande", 3, 4, "decor", "#48ad53"],
  ["tree_medium", "Árvore média", 2, 3, "decor", "#48ad53"],
  ["tree_small", "Árvore pequena", 2, 2, "decor", "#48ad53"],
  ["pine", "Pinheiro", 2, 3, "decor", "#27874d"],
  ["dead", "Árvore seca", 2, 3, "decor", "#96724c"],
  ["bush", "Arbusto", 1, 1, "decor", "#58a75c"],
  ["bush_small", "Arbusto pequeno", 1, 1, "decor", "#58a75c"],
  ["flowers", "Flores", 1, 1, "decor", "#f5abc5"],
  ["rock", "Rocha", 1, 1, "decor", "#879397"],
  ["stump", "Toco", 1, 1, "decor", "#96724c"],
  ["log", "Tronco caído", 2, 1, "decor", "#96724c"],
  ["mountain", "Montanha", 2, 2, "structures", "#7c8986"],
  ["stone_wall", "Parede de pedra", 1, 1, "structures", "#a8a3b3"],
  ["house", "Casa pequena", 4, 4, "structures", "#2581b6"],
  ["town_hall", "Prefeitura", 6, 6, "structures", "#3979a8"],
  ["tavern", "Taverna", 5, 4, "structures", "#2581b6"],
  ["weapons", "Loja de armas", 4, 4, "structures", "#2581b6"],
  ["potions", "Loja de poções", 4, 4, "structures", "#2581b6"],
  ["bench", "Banco", 2, 1, "decor", "#a8794d"],
  ["stall", "Barraca", 3, 3, "structures", "#ac5d52"],
  ["well", "Poço", 2, 2, "decor", "#8e9899"],
  ["barrel", "Barril", 1, 1, "decor", "#9e7146"],
  ["bridge", "Ponte vertical", 2, 4, "structures", "#af845b"],
  ["bridge_h", "Ponte horizontal", 4, 2, "structures", "#af845b"],
  ["ruin_altar", "Altar das ruínas", 5, 5, "structures", "#8f8b82"],
  ["cave", "Entrada de caverna", 3, 3, "structures", "#4b5152"],
  ["fountain", "Fonte", 3, 3, "decor", "#59a9c4"],
  ["chest", "Baú", 1, 1, "decor", "#d89a38"],
  ["bridge_side", "Corda horizontal", 1, 1, "decor", "#805b52"],
  ["bridge_side_v", "Corda vertical", 1, 1, "decor", "#805b52"],
  ["fence", "Cerca horizontal", 1, 1, "decor", "#c49a6c"],
  ["fence_v", "Cerca vertical", 1, 1, "decor", "#c49a6c"],
  ["torch", "Tocha", 1, 1, "decor", "#e7a43c"],
  ["npc", "Aldeão", 1, 1, "characters", "#a66f5a"],
  ["player", "Player", 1, 1, "characters", "#3459b8"],
  ["slime", "Slime", 1, 1, "characters", "#6fd36b"],
  ["boar", "Javali", 1, 1, "characters", "#805a43"],
  ["wolf", "Lobo", 1, 1, "characters", "#75808c"],
  ["kobold", "Sentinela Kobold", 1, 1, "characters", "#b46d45"],
  ["kobold_lord", "Kobold Lord", 2, 2, "characters", "#8c3b35"],
  ["bee", "Abelha gigante", 1, 1, "characters", "#e4b62f"],
  ["plant", "Planta carnívora", 1, 1, "characters", "#67a94b"],
  ["golem", "Golem de pedra", 2, 2, "characters", "#8f887c"],
  ["lizard", "Guerreiro lagarto", 1, 1, "characters", "#70a85e"],
  ["skeleton", "Esqueleto", 1, 1, "characters", "#d8d2bb"],
  ["dragon", "Dragão vermelho", 2, 2, "characters", "#c9503e"],
].map(([id, name, w, h, layer, color]) => ({
  id,
  name,
  w,
  h,
  layer,
  color,
  hitbox: { x: 0, y: 0, w, h },
  ...(ENVIRONMENT_SOURCES[id]
    ? {
        src: `/sprites/environment/cut/${id}.png`,
        source: null,
        atlasSource: ENVIRONMENT_SOURCES[id],
      }
    : layer === "terrain"
    ? {
        src: `/terrain/${id}.png${id === "stone_walk_grass_clean" ? "?v=2" : id === "stone_walk_corner_tl" ? "?v=4" : id.startsWith("transition_") || id.startsWith("bank_") ? "?v=3" : ""}`,
      }
    : ["boar", "wolf", "bee", "plant", "golem", "lizard", "skeleton", "dragon"].includes(id)
      ? { src: `/sprites/monsters/custom/${id}-idle.png` }
    : id === "stone_wall"
      ? { src: "/structures/stone_wall.png" }
      : {}),
})).concat(
  [
    ["espadachim-sombrio", "Kirito"],
    ["espadachim-laranja", "Asuna"],
    ["guerreiro-vermelho", "Klein"],
    ["guerreiro-machado", "Agil"],
    ["guerreira-rosa", "Lisbeth"],
  ].map(([id, name]) => ({
    id,
    name,
    w: 1,
    h: 1,
    layer: "characters",
    color: "#8091a8",
    hitbox: { x: 0.15, y: 0.1, w: 0.7, h: 0.85 },
    src: `/sprites/personagens/herois/${id}/frames/idle-down.png`,
  })),
  atlasExtraAssets,
  saoAssets,
);
export const defaultFolders = {
  Importados: {
    "SAO assets": saoAssets.map((asset) => asset.id),
    "Meus sprites": [],
  },
  Mundo: {
    Terrenos: [
      "stone_walk_grass_clean",
      ...stoneWalkAssets.map((a) => a[0]),
      ...extraTerrain.map((a) => a[0]),
      "grass",
      "dirt",
      "path",
      "stone",
      "stone_edge_t",
      "stone_edge_b",
      "stone_edge_l",
      "stone_edge_r",
      "stone_corner_tl",
      "stone_corner_tr",
      "stone_corner_bl",
      "stone_corner_br",
      "stone_inner_tl",
      "stone_inner_tr",
      "stone_inner_bl",
      "stone_inner_br",
      "sand",
      "snow",
      "water",
      "water_edge_l",
      "water_edge_r",
      "water_edge_t",
      "water_edge_b",
      "water_corner_tl",
      "water_corner_tr",
      "water_corner_bl",
      "water_corner_br",
      "water_inner_tl",
      "water_inner_tr",
      "water_inner_bl",
      "water_inner_br",
      ...atlasExtraAssets.filter((asset) => asset.layer === "terrain").map((asset) => asset.id),
    ],
    Natureza: ["tree", "tree_medium", "tree_small", "pine", "dead", "bush", "bush_small", "rock", "mountain", "stump", "log", "flowers", ...atlasExtraAssets.filter((asset) => NATURE_EXTRA_IDS.has(asset.id)).map((asset) => asset.id)],
  },
  Cidade: {
    Construções: [
      "stone_wall",
      "house",
      "town_hall",
      "tavern",
      "weapons",
      "potions",
      "stall",
      "bridge",
      "bridge_h",
      "bridge_side",
      "bridge_side_v",
      "ruin_altar",
      "cave",
      ...atlasExtraAssets.filter((asset) => asset.layer === "structures").map((asset) => asset.id),
    ],
    Decoração: ["bench", "well", "fountain", "chest", "barrel", "fence", "fence_v", "torch", ...atlasExtraAssets.filter((asset) => asset.layer === "decor" && !NATURE_EXTRA_IDS.has(asset.id)).map((asset) => asset.id)],
  },
  Personagens: {
    Player: ["player"],
    NPCs: ["npc"],
    Heróis: ["espadachim-sombrio", "espadachim-laranja", "guerreiro-vermelho", "guerreiro-machado", "guerreira-rosa"],
  },
  Monstros: {
    Criaturas: ["slime", "boar", "wolf", "bee", "plant", "golem", "lizard", "skeleton", "kobold"],
    Chefes: ["dragon", "kobold_lord"],
  },
};
export const newMap = (name = "Novo mapa", w = 50, h = 26, base = "grass") => ({
  name,
  w,
  h,
  ground: Array(w * h).fill(base),
  objects: [],
  terrainRotations: {},
  portals: {},
  collisions: {},
  visible: { terrain: true, structures: true, decor: true, characters: true },
  locked: {
    terrain: false,
    structures: false,
    decor: false,
    characters: false,
  },
});
export function initialProject() {
  const village = newMap("01 — Cidade Inicial");
  for (let y = 0; y < village.h; y++)
    for (let x = 0; x < village.w; x++) {
      if ((x >= 33 && x <= 39) || (y >= 21 && x >= 28))
        village.ground[y * village.w + x] = "water";
      else if (x >= 10 && x <= 30 && y >= 9 && y <= 18)
        village.ground[y * village.w + x] = "stone_walk_base";
      else if (x >= 5 && x <= 8 && y >= 8)
        village.ground[y * village.w + x] = "path";
    }
  const baseGround = [...village.ground],
    isWater = (x, y) =>
      x >= 0 &&
      y >= 0 &&
      x < village.w &&
      y < village.h &&
      baseGround[y * village.w + x] === "water";
  for (let y = 0; y < village.h; y++)
    for (let x = 0; x < village.w; x++)
      if (isWater(x, y)) {
        const l = !isWater(x - 1, y),
          r = !isWater(x + 1, y),
          t = !isWater(x, y - 1),
          b = !isWater(x, y + 1);
        const diagonal = !isWater(x - 1, y - 1)
          ? "water_inner_tl"
          : !isWater(x + 1, y - 1)
            ? "water_inner_tr"
            : !isWater(x - 1, y + 1)
              ? "water_inner_bl"
              : !isWater(x + 1, y + 1)
                ? "water_inner_br"
                : "water";
        const edge =
          t && l
            ? "water_corner_tl"
            : t && r
              ? "water_corner_tr"
              : b && l
                ? "water_corner_bl"
                : b && r
                  ? "water_corner_br"
                  : l
                    ? "water_edge_l"
                    : r
                      ? "water_edge_r"
                      : t
                        ? "water_edge_t"
                        : b
                          ? "water_edge_b"
                          : diagonal;
        village.ground[y * village.w + x] = edge;
      }
  const isStone = (x, y) =>
    x >= 0 &&
    y >= 0 &&
    x < village.w &&
    y < village.h &&
    baseGround[y * village.w + x] === "stone_walk_base";
  for (let y = 0; y < village.h; y++)
    for (let x = 0; x < village.w; x++)
      if (isStone(x, y)) {
        const l = !isStone(x - 1, y),
          r = !isStone(x + 1, y),
          t = !isStone(x, y - 1),
          b = !isStone(x, y + 1);
        const diagonal = !isStone(x - 1, y - 1)
          ? "stone_walk_inner_tl"
          : !isStone(x + 1, y - 1)
            ? "stone_walk_inner_tr"
            : !isStone(x - 1, y + 1)
              ? "stone_walk_inner_bl"
              : !isStone(x + 1, y + 1)
                ? "stone_walk_inner_br"
                : "stone_walk_base";
        village.ground[y * village.w + x] =
          t && l
            ? "stone_walk_corner_tl"
            : t && r
              ? "stone_walk_corner_tr"
              : b && l
                ? "stone_walk_corner_bl"
                : b && r
                  ? "stone_walk_corner_br"
                  : l
                    ? "stone_walk_edge_l"
                    : r
                      ? "stone_walk_edge_r"
                      : t
                        ? "stone_walk_edge_t"
                        : b
                          ? "stone_walk_edge_b"
                          : diagonal;
      }
  const add = (id, x, y, extra = {}) =>
    village.objects.push({ uid: randomId(), id, x, y, ...extra });
  add("house", 2, 2);
  add("tavern", 13, 2);
  add("weapons", 23, 2);
  add("house", 2, 15);
  add("tree", 0, 10);
  add("tree", 9, 21);
  add("tree", 43, 4);
  add("well", 18, 12);
  add("bench", 14, 12);
  add("stall", 25, 13);
  add("bridge_h", 33, 12);
  add("bridge_h", 34, 12);
  add("bridge_h", 35, 12);
  add("bridge_side", 34, 13, { solid: false });
  add("torch", 11, 10);
  add("flowers", 5, 5);
  add("flowers", 20, 19);
  add("flowers", 40, 8);
  add("npc", 18, 16, {
    name: "Aldeão",
    dialogue: "Bem-vindo à vila!",
    solid: true,
  });
  add("player", 10, 18, { solid: false });
  village.portals["S8"] = { to: "tavern", arrival: "C9" };
  const tavern = newMap("Interior · Taverna", 16, 12, "stone");
  tavern.objects.push(
    { uid: randomId(), id: "barrel", x: 3, y: 4 },
    {
      uid: randomId(),
      id: "npc",
      x: 9,
      y: 4,
      name: "Taverneiro",
      dialogue: "Uma bebida quente?",
      solid: true,
    },
  );
  tavern.portals["C10"] = { to: "village", arrival: "S9" };
  const fields = newMap("02 — Campos Verdes");
  const forest = newMap("03 — Floresta");
  const ruins = newMap("04 — Ruínas do Chefe", 50, 26, "stone_walk_base");
  const scatter = (target, id, points) =>
    points.forEach(([x, y], index) =>
      target.objects.push({
        uid: randomId(),
        id,
        x,
        y,
        solid: id !== "flowers",
        ...(id === "npc"
          ? {
              name: index ? "Explorador" : "Guia de Aincrad",
              dialogue: "As bordas conectam as quatro regiões deste andar.",
            }
          : {}),
      }),
    );
  for (let x = 0; x < fields.w; x++) fields.ground[12 * fields.w + x] = "path";
  for (let y = 0; y < forest.h; y++) forest.ground[y * forest.w + 25] = "path";
  scatter(fields, "bush", [
    [8, 7],
    [18, 18],
    [34, 5],
    [43, 19],
  ]);
  scatter(fields, "flowers", [
    [12, 4],
    [30, 17],
    [39, 9],
  ]);
  scatter(forest, "tree", [
    [3, 3],
    [10, 16],
    [18, 5],
    [31, 15],
    [39, 4],
    [45, 19],
  ]);
  scatter(forest, "rock", [
    [22, 9],
    [28, 20],
  ]);
  scatter(ruins, "stone_wall", [
    [8, 6],
    [9, 6],
    [40, 6],
    [41, 6],
    [8, 19],
    [41, 19],
  ]);
  scatter(ruins, "torch", [
    [17, 8],
    [32, 8],
    [17, 18],
    [32, 18],
  ]);
  const enemy = (target, id, x, y, hp, damage, xp, extra = {}) =>
    target.objects.push({
      uid: randomId(),
      id,
      x,
      y,
      solid: true,
      enemy: { hp, damage, xp, ...extra },
    });
  enemy(fields, "slime", 14, 8, 28, 6, 12);
  enemy(fields, "slime", 30, 18, 28, 6, 12);
  enemy(fields, "boar", 40, 7, 44, 9, 18);
  enemy(forest, "wolf", 13, 8, 52, 10, 24);
  enemy(forest, "wolf", 36, 18, 52, 10, 24);
  enemy(forest, "kobold", 42, 8, 70, 13, 35);
  enemy(ruins, "kobold", 15, 13, 70, 13, 35);
  enemy(ruins, "kobold", 34, 13, 70, 13, 35);
  enemy(ruins, "kobold_lord", 24, 11, 360, 18, 250, {
    boss: true,
    name: "Kobold Lord",
  });

  // Reference layouts: every outdoor screen is exactly 50 x 26 logical tiles.
  const paintRect = (target, id, x, y, w, h) => {
    for (let row = y; row < Math.min(target.h, y + h); row++)
      for (let column = x; column < Math.min(target.w, x + w); column++)
        if (row >= 0 && column >= 0) target.ground[row * target.w + column] = id;
  };
  const place = (target, id, x, y, extra = {}) => {
    const sector = target.sectors?.find(
      (item) => x >= item.x && x < item.x + item.w && y >= item.y && y < item.y + item.h,
    );
    target.objects.push({
      uid: randomId(),
      id,
      x,
      y,
      sector: extra.sector || sector?.id || null,
      ...extra,
    });
  };
  const reset = (target, base, sectors) => {
    target.ground.fill(base);
    target.objects = [];
    target.portals = {};
    target.collisions = {};
    target.sectors = sectors;
  };

  // Cidade Inicial intentionally starts empty so it can be rebuilt from scratch.
  reset(village, "grass_clean", []);

  reset(fields, "grass", [
    { id: "A", name: "Campos / Floresta", x: 0, y: 0, w: 24, h: 13 },
    { id: "B", name: "Cachoeira / Elevação", x: 24, y: 0, w: 26, h: 13 },
    { id: "C", name: "Rio / Ponte", x: 24, y: 13, w: 26, h: 13 },
    { id: "D", name: "Rochas / Exploração", x: 0, y: 13, w: 24, h: 13 },
  ]);
  for (let x = 0; x < 42; x++) paintRect(fields, "path", x, 12 + Math.round(Math.sin(x / 6) * 3), 1, 3);
  paintRect(fields, "water", 43, 0, 7, 26);
  place(fields, "bridge_h", 41, 13, { solid: false });
  [[2, 2], [10, 4], [18, 1], [25, 4], [32, 9], [4, 18], [19, 19], [29, 17]].forEach(([x, y], index) => place(fields, ["tree", "tree_medium", "pine"][index % 3], x, y));
  [[7, 8], [15, 16], [27, 6], [36, 18]].forEach(([x, y]) => place(fields, "mountain", x, y));
  [[6, 6], [21, 21], [35, 5]].forEach(([x, y]) => place(fields, "flowers", x, y));
  [[1, 11], [12, 2], [23, 18], [34, 2]].forEach(([x, y]) => place(fields, "bush", x, y));
  [[16, 6], [31, 20]].forEach(([x, y]) => place(fields, "log", x, y));
  [[9, 16], [27, 11], [38, 17]].forEach(([x, y]) => place(fields, "stump", x, y));
  place(fields, "chest", 39, 5);
  enemy(fields, "slime", 14, 8, 28, 6, 12);
  enemy(fields, "slime", 30, 18, 28, 6, 12);
  enemy(fields, "boar", 38, 8, 44, 9, 18);

  reset(forest, "grass", [
    { id: "A", name: "Floresta Densa", x: 0, y: 0, w: 24, h: 13 },
    { id: "B", name: "Caverna / Penhasco", x: 24, y: 0, w: 26, h: 13 },
    { id: "C", name: "Colina / Lago", x: 0, y: 13, w: 24, h: 13 },
    { id: "D", name: "Trilha / Exploração", x: 24, y: 13, w: 26, h: 13 },
  ]);
  for (let y = 0; y < 26; y++) paintRect(forest, "path", 23 + Math.round(Math.sin(y / 4) * 5), y, 3, 1);
  paintRect(forest, "water", 0, 21, 23, 5);
  place(forest, "bridge", 22, 20, { solid: false });
  place(forest, "cave", 39, 2);
  [
    ["tree", 0, 0], ["tree_medium", 5, 0], ["pine", 10, 0],
    ["tree", 15, 1], ["tree_medium", 31, 0], ["pine", 36, 0],
    ["tree", 42, 0], ["tree_medium", 47, 1], ["pine", 2, 5],
    ["tree", 8, 5], ["tree_medium", 14, 6], ["pine", 33, 5],
    ["tree", 39, 5], ["tree_medium", 45, 6], ["pine", 0, 11],
    ["tree", 7, 11], ["tree_medium", 14, 12], ["pine", 34, 11],
    ["tree", 41, 11], ["tree_medium", 47, 12], ["pine", 2, 17],
    ["tree", 9, 18], ["tree_medium", 15, 19], ["pine", 34, 17],
    ["tree", 40, 18], ["tree_medium", 46, 19],
  ].forEach(([id, x, y]) => place(forest, id, x, y));
  [[8, 14], [31, 15], [44, 18]].forEach(([x, y]) => place(forest, "mountain", x, y));
  [[6, 10], [17, 15], [30, 8], [41, 13]].forEach(([x, y]) => place(forest, "bush", x, y));
  [[12, 12], [34, 20]].forEach(([x, y]) => place(forest, "log", x, y));
  [[18, 7], [29, 16], [45, 9]].forEach(([x, y]) => place(forest, "stump", x, y));
  [[15, 5], [33, 12], [44, 16]].forEach(([x, y]) => place(forest, "flowers", x, y));
  place(forest, "chest", 42, 6);
  enemy(forest, "wolf", 13, 8, 52, 10, 24);
  enemy(forest, "wolf", 36, 18, 52, 10, 24);
  enemy(forest, "kobold", 42, 8, 70, 13, 35);

  reset(ruins, "dirt", [
    { id: "A", name: "Entrada / Ruínas Externas", x: 0, y: 0, w: 24, h: 13 },
    { id: "B", name: "Templo / Arena do Chefe", x: 24, y: 0, w: 26, h: 13 },
    { id: "C", name: "Ruínas Laterais", x: 0, y: 13, w: 24, h: 13 },
    { id: "D", name: "Rio / Ponte / Saída", x: 24, y: 13, w: 26, h: 13 },
  ]);
  paintRect(ruins, "stone_walk_base", 13, 4, 23, 18);
  paintRect(ruins, "water", 42, 0, 8, 26);
  place(ruins, "bridge_h", 40, 15, { solid: false });
  place(ruins, "ruin_altar", 22, 8);
  place(ruins, "cave", 23, 0);
  for (let x = 11; x < 38; x++) {
    place(ruins, "stone_wall", x, 3);
    if (x < 21 || x > 28) place(ruins, "stone_wall", x, 22);
  }
  for (let y = 4; y < 22; y++) {
    place(ruins, "stone_wall", 11, y);
    place(ruins, "stone_wall", 37, y);
  }
  [[17, 7], [32, 7], [17, 18], [32, 18]].forEach(([x, y]) => place(ruins, "torch", x, y));
  [[2, 2], [5, 16], [39, 2], [4, 22]].forEach(([x, y]) => place(ruins, "dead", x, y));
  place(ruins, "chest", 34, 19);
  [[4, 8], [7, 20], [39, 8]].forEach(([x, y]) => place(ruins, "mountain", x, y));
  [[14, 6], [35, 6], [14, 19], [35, 19]].forEach(([x, y]) => place(ruins, "barrel", x, y));
  enemy(ruins, "kobold", 15, 13, 70, 13, 35);
  enemy(ruins, "kobold", 34, 13, 70, 13, 35);
  enemy(ruins, "kobold_lord", 24, 11, 360, 18, 250, { boss: true, name: "Kobold Lord" });

  const resolveWaterEdges = (target) => {
    const water = target.ground.map((id) => id === "water");
    const hasWater = (x, y) =>
      x >= 0 && y >= 0 && x < target.w && y < target.h && water[y * target.w + x];
    for (let y = 0; y < target.h; y++)
      for (let x = 0; x < target.w; x++) {
        if (!hasWater(x, y)) continue;
        const left = !hasWater(x - 1, y),
          right = !hasWater(x + 1, y),
          top = !hasWater(x, y - 1),
          bottom = !hasWater(x, y + 1);
        target.ground[y * target.w + x] = top && left
          ? "water_corner_tl"
          : top && right
            ? "water_corner_tr"
            : bottom && left
              ? "water_corner_bl"
              : bottom && right
                ? "water_corner_br"
                : left
                  ? "water_edge_l"
                  : right
                    ? "water_edge_r"
                    : top
                      ? "water_edge_t"
                      : bottom
                        ? "water_edge_b"
                        : "water";
      }
  };
  [village, fields, forest, ruins].forEach(resolveWaterEdges);
  return {
    version: 38,
    current: "village",
    currentFloor: "floor_01",
    floors: [
      {
        id: "floor_01",
        number: 1,
        name: "Planícies do Início",
        boss: "Kobold Lord",
        unlocked: true,
        maps: ["village", "fields", "forest", "ruins"],
      },
      ...[
        [2, "Floresta das Sombras", "Lobo Alfa"],
        [3, "Montanhas de Pedra", "Golem Ancião"],
        [4, "Pântano Esquecido", "Serpente Gigante"],
        [5, "Vila dos Lagos", "Guardião Aquático"],
        [6, "Deserto Perdido", "Escorpião Rei"],
        [7, "Floresta Encantada", "Ent Corrompido"],
        [8, "Fortaleza Medieval", "Cavaleiro Negro"],
        [9, "Montanhas Geladas", "Dragão de Gelo"],
        [10, "Castelo de Aincrad", "Guardião do Castelo"],
      ].map(([number, name, boss]) => ({
        id: `floor_${String(number).padStart(2, "0")}`,
        number,
        name,
        boss,
        unlocked: false,
        maps: [],
      })),
    ],
    maps: { village, fields, forest, ruins, tavern },
    assets: initialAssets,
    folders: structuredClone(defaultFolders),
  };
}
export const coord = (x, y) => String.fromCharCode(65 + y) + (x + 1);
export function parseCoord(s) {
  const m = /^([A-Z])(\d+)$/i.exec(s || "");
  return m ? { x: +m[2] - 1, y: m[1].toUpperCase().charCodeAt(0) - 65 } : null;
}
export function drawSprite(ctx, asset, x, y, unit = 32, images = {}) {
  if (!asset) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(unit / 32, unit / 32);
  const rect = (a, b, w, h, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(a, b, w, h);
    },
    poly = (points, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      points.forEach((p, i) => (i ? ctx.lineTo(...p) : ctx.moveTo(...p)));
      ctx.closePath();
      ctx.fill();
    };
  const id = asset.id;
  if (asset.animationSet?.frames) {
    const state = asset.animationSet.activeState || "front";
    const frameIds = asset.animationSet.frames[state]?.length
      ? asset.animationSet.frames[state]
      : Object.values(asset.animationSet.frames).find((items) => items?.length) || [];
    const frame = Math.floor(Date.now() / (1000 / Math.max(1, asset.animationSet.fps || 6))) % Math.max(1, frameIds.length);
    const img = images[frameIds[frame]];
    if (img?.complete && img.naturalWidth) {
      const scale = Math.min((asset.w * 32) / img.naturalWidth, (asset.h * 32) / img.naturalHeight);
      const width = img.naturalWidth * scale;
      const height = img.naturalHeight * scale;
      ctx.drawImage(img, (asset.w * 32 - width) / 2, asset.h * 32 - height, width, height);
    }
    ctx.restore();
    return;
  }
  if (asset.src) {
    const img = images[id];
    if (img?.complete && img.naturalWidth) {
      const source = asset.source;
      if (source)
        ctx.drawImage(
          img,
          source.x,
          source.y,
          source.w,
          source.h,
          0,
          0,
          asset.w * 32,
          asset.h * 32,
        );
      else if (asset.animation?.frames > 1) {
        const frames = Math.max(1, Math.floor(asset.animation.frames));
        const fps = Math.max(1, asset.animation.fps || 6);
        const frame = Math.floor(Date.now() / (1000 / fps)) % frames;
        const legacyVertical = asset.animation.direction === "vertical";
        const columns = Math.max(1, Math.floor(asset.animation.columns || (legacyVertical ? 1 : frames)));
        const rows = Math.max(1, Math.floor(asset.animation.rows || (legacyVertical ? frames : 1)));
        const sw = img.naturalWidth / columns;
        const sh = img.naturalHeight / rows;
        const column = frame % columns;
        const row = Math.floor(frame / columns) % rows;
        ctx.drawImage(
          img,
          column * sw,
          row * sh,
          sw,
          sh,
          0,
          0,
          asset.w * 32,
          asset.h * 32,
        );
      } else ctx.drawImage(img, 0, 0, asset.w * 32, asset.h * 32);
    }
    ctx.restore();
    return;
  }
  if (asset.layer === "terrain") {
    rect(0, 0, 32, 32, asset.color);
    if (id.startsWith("water")) {
      for (let i = 0; i < 5; i++) {
        let x = (i * 13 + 2) % 30,
          y = (i * 9 + 5) % 29;
        rect(x, y, 5, 1, "#8ee5f4");
        rect(x + 1, y + 2, 3, 1, "#2ca5d7");
      }
      const shore = (side) => {
        const vertical = side === "l" || side === "r",
          far = side === "r" || side === "b";
        rect(
          vertical && far ? 26 : 0,
          !vertical && far ? 26 : 0,
          vertical ? 6 : 32,
          vertical ? 32 : 6,
          "#62ba60",
        );
        rect(
          vertical && far ? 29 : 0,
          !vertical && far ? 29 : 0,
          vertical ? 3 : 32,
          vertical ? 32 : 3,
          "#91dd79",
        );
        for (let i = 0; i < 5; i++) {
          let n = (i * 7 + 3) % 29;
          if (side === "l") rect(6, n, 2, 3, "#82ce6a");
          if (side === "r") rect(24, n, 2, 3, "#82ce6a");
          if (side === "t") rect(n, 6, 3, 2, "#82ce6a");
          if (side === "b") rect(n, 24, 3, 2, "#82ce6a");
        }
      };
      if (id.startsWith("water_corner_")) {
        const corner = id.slice(-2),
          left = corner.includes("l"),
          top = corner.includes("t");
        rect(left ? 0 : 26, 0, 6, 32, "#62ba60");
        rect(0, top ? 0 : 26, 32, 6, "#62ba60");
        rect(left ? 0 : 29, 0, 3, 32, "#91dd79");
        rect(0, top ? 0 : 29, 32, 3, "#91dd79");
        for (let i = 0; i < 4; i++) {
          const n = 10 + i * 6;
          if (left) rect(6, n, 2, 3, "#82ce6a");
          else rect(24, n, 2, 3, "#82ce6a");
          if (top) rect(n, 6, 3, 2, "#82ce6a");
          else rect(n, 24, 3, 2, "#82ce6a");
        }
      } else if (id.startsWith("water_inner_")) {
        const corner = id.slice(-2),
          x = corner.includes("l") ? 0 : 26,
          y = corner.includes("t") ? 0 : 26;
        rect(x, y, 6, 6, "#62ba60");
        rect(
          corner.includes("l") ? x : x + 3,
          corner.includes("t") ? y : y + 3,
          3,
          3,
          "#91dd79",
        );
      } else if (id !== "water") shore(id.slice(-1));
    } else if (id === "grass") {
      for (let i = 0; i < 8; i++) {
        let x = (i * 11 + 3) % 30,
          y = (i * 17 + 7) % 29;
        rect(x, y, 2, 2, i % 3 ? "#a5e88a" : "#6dc65d");
        rect(x + 2, y + 1, 1, 2, "#6dc65d");
      }
    } else if (id === "stone") {
      for (let y = 2; y < 32; y += 8)
        for (let x = y % 16 ? 0 : 4; x < 32; x += 11) {
          rect(x, y, 8, 5, "#dfd4df");
          rect(x, y + 5, 8, 1, "#a99caf");
          rect(x + 8, y, 1, 6, "#a99caf");
        }
    } else
      for (let i = 0; i < 8; i++)
        rect(
          (i * 13 + 5) % 30,
          (i * 19 + 4) % 30,
          3,
          2,
          id === "snow" ? "#fff" : id === "sand" ? "#f5e1b7" : "#d4b68b",
        );
  } else if (id === "tree" || id === "dead") {
    const width = asset.w * 32,
      height = asset.h * 32,
      trunkX = Math.round(width / 2 - 6);
    rect(trunkX, height * 0.45, 12, height * 0.5, "#76543a");
    rect(trunkX - 6, height * 0.7, 6, height * 0.22, "#8b6340");
    rect(trunkX + 12, height * 0.72, 6, height * 0.2, "#8b6340");
    if (id === "tree") {
      rect(5, height * 0.28, width - 10, height * 0.3, "#247c48");
      rect(12, height * 0.14, width - 24, height * 0.32, "#39a45a");
      rect(width * 0.34, 3, width * 0.34, height * 0.28, "#59bc60");
      for (let i = 0; i < 23; i++) {
        let x = 8 + ((i * 17) % Math.max(10, width - 16)),
          y = 5 + ((i * 11) % Math.max(10, height * 0.4));
        rect(x, y, 5, 4, i % 3 ? "#99db65" : "#d1ee78");
      }
    } else {
      rect(5, height * 0.48, width - 10, 5, "#76543a");
      rect(width * 0.25, height * 0.2, 6, height * 0.35, "#876344");
      rect(width * 0.72, height * 0.15, 5, height * 0.4, "#876344");
    }
  } else if (["house", "town_hall", "tavern", "weapons", "potions"].includes(id)) {
    const width = asset.w * 32,
      height = asset.h * 32,
      roof = id === "tavern" ? "#a95047" : "#2387be";
    rect(6, height * 0.38, width - 12, height * 0.58, "#eee8e5");
    poly([[2, height * 0.4], [width / 2, 4], [width - 2, height * 0.4]], roof);
    rect(4, height * 0.39, width - 8, 6, "#d4c5ce");
    rect(width / 2 - 11, height * 0.65, 22, height * 0.31, "#705968");
    for (const windowX of [width * 0.2, width * 0.72]) {
      rect(windowX, height * 0.55, 16, 20, "#77728f");
      rect(windowX + 3, height * 0.57, 10, 14, "#42a5c8");
    }
  } else if (id === "bush") {
    rect(3, 15, 26, 14, "#2e763e");
    rect(7, 7, 19, 18, "#4c9b50");
    rect(13, 5, 9, 8, "#90c970");
    for (let i = 0; i < 5; i++)
      rect(6 + i * 5, 9 + (i % 2) * 7, 3, 3, "#d7eb84");
  } else if (id === "flowers") {
    for (let i = 0; i < 5; i++) {
      let x = 4 + ((i * 11) % 24),
        y = 7 + ((i * 7) % 15);
      rect(x + 2, y + 4, 2, 13, "#3d9952");
      rect(x, y, 6, 6, i % 2 ? "#fff1ad" : "#f6acc9");
      rect(x + 2, y + 2, 2, 2, "#f3c94f");
      rect(x - 2, y + 11, 4, 2, "#66bd63");
      rect(x + 4, y + 13, 4, 2, "#66bd63");
    }
  } else if (id === "rock") {
    poly(
      [
        [3, 27],
        [6, 12],
        [15, 5],
        [26, 11],
        [30, 27],
      ],
      "#76828a",
    );
    poly(
      [
        [6, 12],
        [15, 5],
        [20, 14],
        [12, 18],
      ],
      "#c5cdcb",
    );
  } else if (id === "mountain") {
    poly(
      [
        [0, 64],
        [3, 30],
        [31, 3],
        [54, 24],
        [64, 64],
      ],
      "#687870",
    );
    poly(
      [
        [3, 30],
        [31, 3],
        [42, 17],
        [28, 14],
        [19, 27],
      ],
      "#cbd3c9",
    );
  } else if (id === "bench") {
    rect(3, 5, 58, 8, "#8b5b38");
    rect(5, 7, 54, 4, "#c4935f");
    rect(3, 16, 58, 9, "#a8794d");
    rect(5, 17, 54, 5, "#d0a06b");
    rect(7, 25, 5, 7, "#67432e");
    rect(52, 25, 5, 7, "#67432e");
    rect(7, 5, 4, 18, "#62402d");
    rect(53, 5, 4, 18, "#62402d");
  } else if (id === "stall") {
    rect(12, 38, 72, 53, "#a47b4d");
    rect(6, 28, 84, 22, "#a85047");
    for (let i = 0; i < 6; i++) rect(8 + i * 14, 29, 8, 21, "#ecd4a5");
    rect(16, 55, 64, 9, "#74513a");
  } else if (id === "well") {
    rect(9, 30, 46, 31, "#8b9391");
    rect(15, 36, 34, 15, "#32647d");
    poly(
      [
        [3, 26],
        [32, 4],
        [61, 26],
      ],
      "#9b5a42",
    );
    rect(8, 25, 5, 31, "#79553e");
    rect(51, 25, 5, 31, "#79553e");
  } else if (id === "barrel") {
    rect(6, 4, 20, 26, "#9b6c3d");
    rect(6, 8, 20, 4, "#555d5f");
    rect(6, 23, 20, 4, "#555d5f");
  } else if (id === "fence") {
    rect(4, 3, 6, 29, "#765039");
    rect(23, 3, 6, 29, "#765039");
    rect(5, 2, 4, 28, "#c69661");
    rect(24, 2, 4, 28, "#c69661");
    for (let y of [12, 23]) {
      rect(0, y, 32, 7, "#765039");
      rect(1, y + 1, 30, 5, "#d2aa71");
      rect(2, y + 1, 28, 2, "#e2b980");
    }
  } else if (id === "fence_v") {
    rect(12, 0, 3, 32, "#8c623f");
    rect(17, 0, 3, 32, "#8c623f");
    rect(13, 0, 5, 32, "#d1a16e");
    for (let y of [3, 14, 25]) {
      rect(9, y, 14, 6, "#765039");
      rect(10, y - 1, 12, 6, "#c69661");
      rect(12, y, 8, 2, "#e2b980");
    }
  } else if (id === "bridge" || id === "bridge_h") {
    const width = asset.w * 32,
      height = asset.h * 32;
    rect(0, 0, width, height, "#765450");
    rect(3, 3, width - 6, height - 6, "#c89576");
    if (id === "bridge") {
      for (let y = 1; y < height; y += 8) {
        rect(3, y, width - 6, 2, "#8a6257");
        rect(5, y + 3, width - 10, 4, y % 16 ? "#d8a989" : "#b98468");
      }
      for (let y = 4; y < height; y += 12) {
        rect(0, y, 5, 3, "#e8c58e");
        rect(width - 5, y, 5, 3, "#e8c58e");
      }
    } else {
      for (let x = 1; x < width; x += 8) {
        rect(x, 3, 2, height - 6, "#8a6257");
        rect(x + 3, 5, 4, height - 10, x % 16 ? "#d8a989" : "#b98468");
      }
      for (let x = 4; x < width; x += 12) {
        rect(x, 0, 3, 5, "#e8c58e");
        rect(x, height - 5, 3, 5, "#e8c58e");
      }
    }
  } else if (id === "bridge_side" || id === "bridge_side_v") {
    if (id === "bridge_side") {
      for (let x = 0; x < 32; x += 14) {
        rect(x, 6, 4, 21, "#594449");
        rect(x + 1, 5, 3, 4, "#e9c69c");
      }
      for (let x = 0; x < 32; x += 2) {
        let y = 12 + Math.round(3 * Math.sin((x * Math.PI) / 16));
        rect(x, y, 2, 2, "#e0bc8f");
        rect(x, y + 3, 2, 1, "#6b5050");
      }
    } else {
      rect(15, 0, 2, 32, "#6e5145");
      rect(15, 0, 1, 32, "#d9b083");
      for (let y of [4, 15, 26]) {
        rect(13, y, 6, 6, "#755344");
        rect(14, y - 1, 4, 8, "#9d7152");
        rect(13, y + 1, 6, 4, "#b98b63");
        rect(15, y + 1, 2, 2, "#f0c89a");
      }
    }
  } else if (id === "torch") {
    rect(13, 12, 6, 20, "#73503b");
    rect(10, 4, 12, 13, "#e99a39");
    rect(13, 0, 6, 11, "#ffe086");
  } else if (id === "slime") {
    rect(5, 15, 22, 13, "#369c55");
    rect(8, 10, 16, 16, "#6fd36b");
    rect(11, 16, 3, 3, "#152b29");
    rect(19, 16, 3, 3, "#152b29");
    rect(7, 27, 7, 3, "#236e43");
    rect(19, 27, 7, 3, "#236e43");
  } else if (id === "boar") {
    rect(5, 12, 23, 15, "#805a43");
    rect(1, 15, 10, 10, "#9a7054");
    rect(2, 23, 3, 5, "#e1d0ad");
    rect(7, 10, 5, 6, "#5b3d34");
    rect(11, 26, 4, 5, "#3e3030");
    rect(23, 26, 4, 5, "#3e3030");
  } else if (id === "wolf") {
    rect(6, 12, 22, 14, "#75808c");
    poly(
      [
        [3, 17],
        [9, 7],
        [14, 16],
      ],
      "#8f9aa4",
    );
    poly(
      [
        [8, 9],
        [10, 2],
        [14, 10],
      ],
      "#606a75",
    );
    rect(8, 17, 3, 3, "#f1c65f");
    rect(11, 25, 4, 6, "#4f5964");
    rect(23, 25, 4, 6, "#4f5964");
  } else if (id === "kobold" || id === "kobold_lord") {
    const scale = id === "kobold_lord" ? 2 : 1;
    rect(7 * scale, 9 * scale, 18 * scale, 19 * scale, asset.color);
    rect(10 * scale, 3 * scale, 12 * scale, 10 * scale, "#b97b58");
    rect(8 * scale, 1 * scale, 4 * scale, 7 * scale, "#543633");
    rect(20 * scale, 1 * scale, 4 * scale, 7 * scale, "#543633");
    rect(5 * scale, 15 * scale, 5 * scale, 12 * scale, "#4d5664");
    rect(23 * scale, 13 * scale, 4 * scale, 17 * scale, "#d2b05f");
    if (id === "kobold_lord") {
      rect(16, 3, 32, 5, "#d7ad45");
      rect(22, 0, 5, 8, "#e7cd72");
      rect(37, 0, 5, 8, "#e7cd72");
    }
  } else if (id === "player") {
    rect(9, 25, 5, 6, "#342f40");
    rect(18, 25, 5, 6, "#342f40");
    rect(8, 15, 16, 12, "#3159ac");
    rect(11, 6, 10, 11, "#edbf9c");
    rect(8, 4, 16, 6, "#9b4139");
    rect(10, 2, 12, 3, "#ba5a48");
  } else if (id === "npc") {
    rect(10, 15, 12, 14, "#4e7097");
    rect(11, 7, 10, 10, "#e6bc95");
    rect(8, 4, 16, 6, "#835d43");
  } else rect(0, 0, asset.w * 32, asset.h * 32, asset.color);
  ctx.restore();
}
export function renderMap(
  canvas,
  map,
  assets,
  {
    zoom = 1,
    grid = true,
    visible = map.visible,
    selectedObject = null,
    selectedCell = null,
    selectedRange = null,
    hover = null,
    tool = "cursor",
    selectedAsset = null,
    selectedRotation = 0,
    play = false,
    player = null,
    playerFacing = "down",
    playerStep = 0,
    night = 0,
    images = {},
  } = {},
) {
  if (!canvas || !map) return;
  const ctx = canvas.getContext("2d");
  const pixelWidth = Math.round(map.w * TILE * zoom);
  const pixelHeight = Math.round(map.h * TILE * zoom);
  if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
  if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.scale(zoom, zoom);
  const byId = Object.fromEntries(assets.map((a) => [a.id, a]));
  const referenceAsset = byId[map.referenceAsset],
    referenceImage = referenceAsset && images[referenceAsset.id],
    hasReference = Boolean(referenceImage?.complete && referenceImage.naturalWidth);
  if (hasReference) {
    const source = referenceAsset.source;
    ctx.drawImage(
      referenceImage,
      source.x,
      source.y,
      source.w,
      source.h,
      0,
      0,
      map.w * TILE,
      map.h * TILE,
    );
  } else {
    for (let y = 0; y < map.h; y++)
      for (let x = 0; x < map.w; x++)
        drawRotated(
          ctx,
          byId[map.ground[y * map.w + x]] || byId.grass,
          x * TILE,
          y * TILE,
          map.terrainRotations?.[y * map.w + x] || 0,
          images,
        );
  }
  if (!hasReference)
    for (let y = 0; y < map.h; y++)
      for (let x = 0; x < map.w; x++) {
      let id = map.ground[y * map.w + x];
      if (id !== "path") continue;
      const different = (a, b) =>
        a < 0 ||
        b < 0 ||
        a >= map.w ||
        b >= map.h ||
        map.ground[b * map.w + a] !== id;
      ctx.fillStyle = "#b8d48b";
      if (different(x - 1, y)) ctx.fillRect(x * TILE, y * TILE, 3, TILE);
      if (different(x + 1, y)) ctx.fillRect(x * TILE + 29, y * TILE, 3, TILE);
      if (different(x, y - 1)) ctx.fillRect(x * TILE, y * TILE, TILE, 3);
      if (different(x, y + 1)) ctx.fillRect(x * TILE, y * TILE + 29, TILE, 3);
      }
  // Objects from logical layers share a Y-sort pass so feet, roofs and actors
  // overlap naturally while layer visibility remains independently editable.
  const sceneObjects = map.objects
    .filter((object) => {
      const asset = byId[object.id],
        layer = object.layer || asset?.layer;
      return Boolean(asset) && layer !== "terrain" && visible?.[layer] !== false && !(play && object.id === "player");
    })
    .sort((a, b) => {
      const assetA = byId[a.id],
        assetB = byId[b.id];
      const footA = a.y + (rotatedSize(assetA, a.rotation || 0).h || 1);
      const footB = b.y + (rotatedSize(assetB, b.rotation || 0).h || 1);
      return footA - footB || a.x - b.x;
    });
  if (!hasReference)
    for (const object of sceneObjects)
      drawRotated(
        ctx,
        byId[object.id],
        object.x * TILE,
        object.y * TILE,
        object.rotation || 0,
        images,
      );
  if (!play && tool === "collision") {
    ctx.fillStyle = "rgba(225, 72, 72, 0.34)";
    ctx.strokeStyle = "rgba(255, 126, 126, 0.72)";
    ctx.lineWidth = 1;
    for (const cell of Object.keys(map.collisions || {})) {
      const point = parseCoord(cell);
      if (!point) continue;
      ctx.fillRect(point.x * TILE, point.y * TILE, TILE, TILE);
      ctx.strokeRect(point.x * TILE + 0.5, point.y * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }
  for (let c of Object.keys(map.portals || {})) {
    let p = parseCoord(c);
    if (!p) continue;
    ctx.fillStyle = "#f1c95c";
    ctx.fillRect(p.x * TILE + 11, p.y * TILE + 10, 10, 12);
    ctx.fillStyle = "#684d2b";
    ctx.fillRect(p.x * TILE + 14, p.y * TILE + 13, 4, 6);
  }
  if (selectedObject && !play) {
    let a = byId[selectedObject.id];
    if (a) {
      ctx.strokeStyle = "#ffdb76";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        selectedObject.x * TILE + 1,
        selectedObject.y * TILE + 1,
        rotatedSize(a, selectedObject.rotation || 0).w * TILE - 2,
        rotatedSize(a, selectedObject.rotation || 0).h * TILE - 2,
      );
    }
  }
  if (hover && tool === "paint" && selectedAsset && !play) {
    ctx.fillStyle = "#ffffff55";
    ctx.fillRect(
      hover.x * TILE,
      hover.y * TILE,
      rotatedSize(selectedAsset, selectedRotation).w * TILE,
      rotatedSize(selectedAsset, selectedRotation).h * TILE,
    );
  }
  if (play && player) {
    const px = player.x * TILE,
      py = player.y * TILE,
      walk = playerStep % 2 ? 2 : 0;
    ctx.fillStyle = "#342f40";
    ctx.fillRect(px + 9, py + 25 + walk, 5, 6 - walk);
    ctx.fillRect(px + 18, py + 25 - walk, 5, 6 + walk);
    ctx.fillStyle = "#3159ac";
    ctx.fillRect(px + 8, py + 15, 16, 12);
    ctx.fillStyle = "#edbf9c";
    ctx.fillRect(px + 11, py + 6, 10, 11);
    ctx.fillStyle = "#9b4139";
    ctx.fillRect(px + 8, py + 4, 16, 6);
    ctx.fillStyle = "#ba5a48";
    ctx.fillRect(px + 10, py + 2, 12, 3);
    if (playerFacing === "left" || playerFacing === "right") {
      ctx.fillStyle = "#68413c";
      ctx.fillRect(px + (playerFacing === "left" ? 10 : 20), py + 10, 2, 2);
    } else if (playerFacing === "down") {
      ctx.fillStyle = "#68413c";
      ctx.fillRect(px + 13, py + 11, 2, 2);
      ctx.fillRect(px + 18, py + 11, 2, 2);
    }
  }
  if (night > 0) {
    ctx.fillStyle = `rgba(9,17,48,${night * 0.7})`;
    ctx.fillRect(0, 0, map.w * TILE, map.h * TILE);
    for (let o of map.objects.filter((o) => o.id === "torch")) {
      let gx = o.x * TILE + 16,
        gy = o.y * TILE + 13;
      let grad = ctx.createRadialGradient(gx, gy, 4, gx, gy, 100);
      grad.addColorStop(0, "rgba(255,202,93,.32)");
      grad.addColorStop(1, "rgba(255,202,93,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(gx - 100, gy - 100, 200, 200);
    }
  }
  if (grid) {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(255,255,255,.48)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= map.w; x++) {
      ctx.moveTo(x * TILE, 0);
      ctx.lineTo(x * TILE, map.h * TILE);
    }
    for (let y = 0; y <= map.h; y++) {
      ctx.moveTo(0, y * TILE);
      ctx.lineTo(map.w * TILE, y * TILE);
    }
    ctx.stroke();
  }
  if (selectedRange && !play) {
    const x = Math.min(selectedRange.x1, selectedRange.x2),
      y = Math.min(selectedRange.y1, selectedRange.y2),
      w = Math.abs(selectedRange.x2 - selectedRange.x1) + 1,
      h = Math.abs(selectedRange.y2 - selectedRange.y1) + 1;
    ctx.fillStyle = "rgba(255,221,112,.18)";
    ctx.fillRect(x * TILE, y * TILE, w * TILE, h * TILE);
    ctx.strokeStyle = "#ffe281";
    ctx.lineWidth = 2;
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, w * TILE - 2, h * TILE - 2);
  } else if (
    selectedCell &&
    !play &&
    selectedCell.x >= 0 &&
    selectedCell.y >= 0 &&
    selectedCell.x < map.w &&
    selectedCell.y < map.h
  ) {
    ctx.fillStyle = "rgba(255,223,112,.16)";
    ctx.fillRect(selectedCell.x * TILE, selectedCell.y * TILE, TILE, TILE);
    ctx.strokeStyle = "#ffe281";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      selectedCell.x * TILE + 1,
      selectedCell.y * TILE + 1,
      TILE - 2,
      TILE - 2,
    );
  }
  ctx.restore();
}
import { randomId } from "./id";


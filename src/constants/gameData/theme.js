export const _mkT = (id, name, cap = 2, capLv = 0) => ({
  id, name,
  capacity: cap,
  capLv,
  status: "libre",
  server: null,
  order: [],
  svcTimer: 0,
  svcMax: 0,
  group: null,
});

export const C = {
  bg:      "#f2ede3",
  surface: "#ffffff",
  surface2:"#faf7f2",
  card:    "#fdfaf5",
  border:  "#ddd0b8",
  green:   "#236b47",
  greenL:  "#2e8a5a",
  greenP:  "#e6f4ed",
  terra:   "#b85a25",
  terraP:  "#fdeee5",
  terraL:  "#d4713a",
  navy:    "#18304f",
  navyP:   "#e4eaf4",
  ink:     "#18130e",
  ink2:    "#2e2419",
  muted:   "#8a7a65",
  red:     "#b83025",
  redP:    "#fce9e8",
  amber:   "#a86e08",
  amberP:  "#fdf3dc",
  purple:  "#5e3492",
  purpleP: "#ece5f8",
  white:   "#ffffff",
  shadow1: "rgba(24,19,14,0.06)",
  shadow2: "rgba(24,19,14,0.12)",
  shadow3: "rgba(24,19,14,0.20)",
};

export const F = {
  title:   "'Playfair Display',Georgia,'Times New Roman',serif",
  display: "'Playfair Display',Georgia,serif",
  body:    "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
  mono:    "'SF Mono','Fira Code',monospace",
};

export const Z = {
  modal:    1000,
  queueBar: 1001,
};

export const QUEUE_BAR_H = 44;

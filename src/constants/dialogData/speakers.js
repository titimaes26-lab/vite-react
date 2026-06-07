export const SPEAKERS_FR = {
  elodie: {
    name: "Élodie",
    title: "Assistante de gestion",
    img: "/elodie.png",
    color: "#1c3352",
    bubble: { left: "45%", top: "3%", width: "52%", height: "44%" },
  },
  gustave: {
    name: "Gustave",
    title: "Chef de cuisine",
    img: "/gustave.png",
    color: "#b85520",
    bubble: { left: "43%", top: "3%", width: "54%", height: "44%" },
  },
};
export const SPEAKERS_EN = {
  elodie: { ...SPEAKERS_FR.elodie, title: "Management Assistant" },
  gustave: { ...SPEAKERS_FR.gustave, title: "Head Chef" },
};

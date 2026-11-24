import {
  CENTRAL_THESIS,
  THEORY_FAQ,
  THEORY_FOUNDATIONS,
  THEORY_GROUPS,
  THEORY_REFERENCES,
  type FAQItem,
  type TheoryGroup,
  type TheorySource,
} from "./theory-data";
import { THEORY_VIDEO_URL } from "./theory-video";
import type { Locale } from "./i18n-shared";

export const THEORY_REFERENCES_EN = {
  video: { label: "Full video", url: THEORY_VIDEO_URL },
  threads: { label: "Threads on X", url: THEORY_REFERENCES.threads.url },
  mechanism: { label: "How the theory works", url: THEORY_REFERENCES.mechanism.url },
  nika: { label: "Luffy, Joy Boy & Nika", url: THEORY_REFERENCES.nika.url },
  ohara: { label: "The Will of Ohara", url: THEORY_REFERENCES.ohara.url },
  prescience: { label: "Communication across eras", url: THEORY_REFERENCES.prescience.url },
  roger: { label: "The ambiguity around Roger", url: THEORY_REFERENCES.roger.url },
  mural: { label: "The Harley Mural", url: THEORY_REFERENCES.mural.url },
  swordAndShield: { label: "The Sword & Shield lead · spoilers", url: THEORY_REFERENCES.swordAndShield.url },
} satisfies Record<string, TheorySource>;

export const CENTRAL_THESIS_EN = {
  title: "The Void Century is the Present",
  subtitle: "What if the legends of the past actually told the story Luffy and his crew are living right now?",
  overview:
    "At the end of their journey, the Straw Hats would have their story carved onto the Poneglyphs and sent back into the past. Those messages would allow peoples across the world to prepare the conditions for victory over centuries—meaning our heroes uncover legends they themselves created.",
  context:
    "The world’s past would remain real: it is the events attributed to the Void Century that belong to the present and the future.",
};

export const THEORY_FOUNDATIONS_EN = [
  {
    title: "Why send these messages back?",
    text: "Victory would only be possible thanks to peoples prepared by the Poneglyphs. After the final battle, the heroes would send back the very messages that enabled that preparation.",
  },
  {
    title: "One single timeline",
    text: "The future completes the already known past. The world does not reset in a loop: after sending the stones back, life moves forward and everyone lives only one adventure.",
  },
  {
    title: "Heroes free in their choices",
    text: "Luffy acts for his friends and his own convictions. Legends are later told from his choices: he is the one who gives birth to Joy Boy simply by living his adventure.",
  },
] as const;

export const THEORY_GROUPS_EN: readonly TheoryGroup[] = [
  {
    id: "heros-et-legendes",
    title: "The heroes behind the legends",
    sections: [
      {
        id: "joy-boy",
        icon: "👑",
        title: "Luffy would become Joy Boy",
        summary:
          "Joy Boy would be the name given by peoples to Luffy, their liberator. His victory over Kaido sparks that recognition, and freeing the world seals the legend—making Luffy the very hero everyone was waiting for.",
      },
      {
        id: "nika",
        icon: "☀️",
        title: "Nika, Joy Boy and Luffy: one and the same",
        summary:
          "Luffy would be his personal name, Joy Boy his legendary name, and Nika his divine name for believers. Kuma’s faith plays a concrete role: by protecting the Straw Hats, he enables the hoped-for liberator to complete his journey.",
        sources: [THEORY_REFERENCES_EN.nika],
      },
      {
        id: "vivi-lili",
        icon: "🌺",
        title: "Vivi would be Lili",
        summary:
          "The vanished queen would be Vivi, who chooses adventure and scatters the Poneglyphs across the world. Her letter asks her ancestors to guard those messages until the new dawn, while Koza could lead the kingdom as the “brother” mentioned in legend.",
      },
      {
        id: "zoro-ryuma",
        icon: "⚔️",
        title: "Zoro would be Ryuma",
        summary:
          "Zoro would be Ryuma, the swordsman whose legend inspired Kuina. His dragon would be Kaido, struck down above the Flower Capital. After achieving his dream, Zoro could entrust his swords to Tashigi, reclaim Shusui, and be sent into the past—explaining Ryuma’s remains.",
      },
      {
        id: "sanji-sora",
        icon: "🔥",
        title: "Sanji would be Sora, Warrior of the Sea",
        summary:
          "The comic-strip hero able to walk on water alongside a giant robot would recount Sanji and Franky’s fight against Germa 66. By destroying his Raid Suit to preserve the humanity passed down by his mother Sora, Sanji embodies its true name—a story from the present later turned into Navy propaganda.",
      },
      {
        id: "teach-davy-jones",
        icon: "🏴‍☠️",
        title: "Teach would become Davy D. Jones",
        summary:
          "The survivor of the Davy clan would fulfill his bloodline’s promise by toppling Imu and claiming the Empty Throne. Imu would have mistaken his father Xebec for him, making Teach the destined King of the World foretold by legend.",
      },
      {
        id: "doflamingo",
        icon: "🦩",
        title: "King Donquixote would be Doflamingo",
        summary:
          "The tale of the ancient tyrant would actually describe Doflamingo’s rule: Tontattas secretly exploited, humans profiting from their labor, and a King Riku restoring peace. Dressrosa’s own story became the myth of its distant past.",
      },
      {
        id: "loki-nidhogg",
        icon: "🐉",
        title: "Loki would become Nidhogg",
        summary:
          "The dragon, Ragnir and Ratatosk would cast Loki as the figure behind the giants’ god of war. Varying depictions would stem from how they interpreted the legend, while his foretold clash with Nika remains to be seen.",
      },
    ],
  },
  {
    id: "transmettre-histoire",
    title: "Those who would pass down history",
    sections: [
      {
        id: "robin-poneglyphes",
        icon: "📜",
        title: "Robin would write the Rio Poneglyph",
        summary:
          "Robin would compose the chronicle and its script, Momonosuke would carve the stones using knowledge passed down from Sukiyaki, and Vivi would scatter them. Robin would realize she has been studying her own work—a memory built to prepare peoples and resist erasure.",
      },
      {
        id: "usopp-harley",
        icon: "📖",
        title: "Usopp would write the Haley",
        summary:
          "Usopp would tell his captain’s adventure as a legend passed on to the giants—and could also be Louis Arnot, author of extraordinary tales. By inspiring their people and the worship of Nika, he fulfills his dream as a brave warrior of the sea.",
      },
      {
        id: "fresque-harley",
        icon: "🎨",
        title: "The mural depicts the story happening right now",
        summary:
          "Giants—perhaps children—would have illustrated the texts received from the future using their own imagery, explaining both the likenesses to today’s heroes and subtle differences. Even the sword and shield could echo Zoro and Sanji.",
        sources: [THEORY_REFERENCES_EN.mural, THEORY_REFERENCES_EN.swordAndShield],
      },
      {
        id: "volonte-ohara",
        icon: "🌳",
        title: "Robin would fulfill the Will of Ohara",
        summary:
          "Clover, Olvia and Vegapunk kept the pursuit of truth alive all the way to Luffy’s generation. By writing the Poneglyphs, Robin completes that legacy while also taking part in its origin—and shining light on the Will of D.",
        sources: [THEORY_REFERENCES_EN.ohara],
      },
    ],
  },
  {
    id: "technologies-du-futur",
    title: "Inventions mistaken for ancient relics",
    sections: [
      {
        id: "ancien-royaume",
        icon: "🏙️",
        title: "The Ancient Kingdom would belong to the future",
        summary:
          "The civilization remembered as ancient would actually be the world yet to come. Its advanced technology—robots, energy sources and materials—would trace back to Vegapunk’s future inventions mistaken for remnants of a forgotten past.",
      },
      {
        id: "emeth",
        icon: "🤖",
        title: "Emeth would be the final Battle Franky",
        summary:
          "Franky and Vegapunk’s satellites would build Emeth, Battle Franky 39, powered by their energy research. A knot inspired by Haredas would store Luffy’s future Haki, and after being sent two centuries into the past, the robot ultimately saves his creators on Egghead.",
      },
      {
        id: "chapeau-geant",
        icon: "👒",
        title: "The giant straw hat would be Emeth’s",
        summary:
          "Luffy and Usopp would gift this hat to Emeth as a bond of friendship, much like Ace and Oars Jr. The robot would lose it upon arriving at Mary Geoise in the past, where Imu keeps it as a trace of the awaited liberator.",
      },
    ],
  },
  {
    id: "imu-et-avenir",
    title: "Imu against the future",
    sections: [
      {
        id: "imu",
        icon: "👁️",
        title: "Imu would try to prevent the future",
        summary:
          "Imu would know the foretold figures without knowing their true identities or eras—explaining confusions like Xebec vs. Teach or Titi vs. Vivi. By oppressing the world to stop that downfall, Imu creates the very world Luffy must liberate.",
      },
      {
        id: "prescience",
        icon: "🔮",
        title: "Eras might be able to communicate",
        summary:
          "Foresight—as shown by Shyarly—could allow information to be received from, or even exchanged with, another era. That would help explain both Imu’s knowledge and Roger’s discovery, though how it works remains unknown.",
        sources: [THEORY_REFERENCES_EN.prescience],
      },
      {
        id: "roger-joy-boy",
        icon: "🧩",
        title: "Roger could have been mistaken for Joy Boy",
        summary:
          "With his straw hat, his dream and his voyage, Roger could have looked like the liberator Imu feared. Some references to Joy Boy might stem from that misidentification.",
        sources: [THEORY_REFERENCES_EN.roger],
      },
    ],
  },
  {
    id: "peuples-et-guerre",
    title: "A world prepared for the same war",
    sections: [
      {
        id: "peuples",
        icon: "🤝",
        title: "Each people would have its role",
        summary:
          "The Fish-Men guard Noah, Wano prepares to open its borders and the Minks guide Zunesha; the Shandians protect their Golden Bell, Alabasta the stones, and Buccaneers and giants keep hope in Nika alive—every nation preparing the promised war of liberation.",
        sources: [THEORY_REFERENCES_EN.mechanism],
      },
      {
        id: "poseidon",
        icon: "🧜‍♀️",
        title: "Poseidon would be Shirahoshi",
        summary:
          "Joy Boy’s promise would be Luffy’s promise to Shirahoshi: taking her up to the surface. The message sent to the past orders the building and protection of Noah so the ark and Sea Kings can save people when the world shifts.",
      },
      {
        id: "galley-la",
        icon: "🔨",
        title: "Galley-La would unite Loki’s companions",
        summary:
          "The frozen giants of Punk Hazard would be Loki’s crew, guarded by Ragnir and Ratatosk. Once freed, they would join Water Seven’s shipwrights to build Pluton—turning another “ancient” guild into a story from the future.",
      },
      {
        id: "pluton",
        icon: "🚢",
        title: "Pluton would be a joint creation",
        summary:
          "Iceburg and the giants would turn Water Seven into a sea-going vessel. Alongside Zunesha, they would open Wano and free Kaido and Big Mom—combining ship and allies into Pluton, a force yet to be assembled.",
      },
      {
        id: "uranus",
        icon: "🔥",
        title: "Mother Flame would power Uranus",
        summary:
          "Vegapunk’s energy would be diverted to fuel an island-destroying power. Mother Flame serves as its fuel, while Uranus itself remains open—whether a flying weapon or Imu wielding that power directly.",
      },
      {
        id: "vingt-rois",
        icon: "♟️",
        title: "The ruling houses would form the Twenty Kings",
        summary:
          "The families of the Five Elders and Holy Knights would make up the coalition described against Joy Boy. Their heirs could reclaim kingdoms and armies to confront Luffy in the war still to come.",
      },
      {
        id: "deluge",
        icon: "🌊",
        title: "The Great Flood would accompany the final war",
        summary:
          "Unleashing the Ancient Weapons would raise sea levels by 200 meters and reshape the world. Noah, giant bridges and the alliance of nations all lead to this approaching upheaval: the war blamed on the past is the one our heroes are about to fight.",
      },
      {
        id: "zunesha",
        icon: "🐘",
        title: "Zunesha would remember the future",
        summary:
          "Like Emeth, Zunesha could have known Luffy before being sent into the past, casting new light on its long wait for Joy Boy’s return. What crime condemned it and how it crossed eras remain to be uncovered.",
      },
    ],
  },
  {
    id: "laugh-tale-et-one-piece",
    title: "Laugh Tale and the fulfillment of dreams",
    sections: [
      {
        id: "laugh-tale",
        icon: "🧭",
        title: "Laugh Tale would be Lodestar in another era",
        summary:
          "Finding the right place would not be enough—you must also arrive at the right time, once the Red Line has vanished. The Road Poneglyphs supply that temporal coordinate, allowing Roger to reach that future ahead of the adventure that creates it.",
      },
      {
        id: "all-blue",
        icon: "🐟",
        title: "Sanji would help create All Blue",
        summary:
          "The fall of the Red Line unites the four seas and fulfills Sanji’s dream. Luffy becomes the first pirate to sail that newly joined ocean—meaning the “first pirate” of legend is the one we have followed from chapter one.",
      },
      {
        id: "one-piece",
        icon: "📚",
        title: "Luffy would be the origin of the One Piece",
        summary:
          "The treasure Roger discovered would be tied to the complete story of Luffy’s journey. By creating it, Luffy surpasses the man who found it and becomes the inspiration behind his own idol, even if its physical form stays a mystery.",
      },
    ],
  },
];

export const THEORY_FAQ_EN: FAQItem[] = [
  {
    question: "Where did this site come from and who are the Bus Fools?",
    answer:
      "A fan project built for fun around Le Mont Corvo’s theory. The “Bus Fools” are everyone who hops aboard to explore it, back it, or simply enjoy the ride.",
  },
  {
    question: "What is the purpose of the site?",
    answer:
      "To bring the experience to life inside an interactive bus: pick your character, join fellow passengers, and watch the breakdown onboard alongside a concise overview and full references.",
  },
  {
    question: "What is the core idea?",
    answer:
      "Stories from the Void Century would actually describe Luffy’s present-day voyage. Written at the end of his journey and sent back into the past, the Poneglyphs prepare peoples for the very victory they recount.",
  },
  {
    question: "Why send the Poneglyphs back after already winning?",
    answer:
      "Because victory was made possible by the preparations sparked by those messages. By sending them back after the battle, the heroes complete the very act that allowed the world to await and assist them.",
  },
  {
    question: "Does history repeat in an endless loop?",
    answer:
      "No—there is only one continuous timeline. The messages were always part of the known past, so sending them back does not reset the world: life moves straight ahead into the future.",
  },
  {
    question: "Do the characters still have free will?",
    answer:
      "Legends are simply stories told about the heroes’ choices. Luffy never tries to follow an ancient script: he acts on his convictions, and his journey later becomes the legend.",
  },
  {
    question: "Did Joy Boy lose a war before?",
    answer:
      "There was never a first timeline where Luffy lost. Stories of defeat and a promised return simply served to keep hope alive and prepare nations for the real struggle.",
  },
  {
    question: "Why was Roger “too early”?",
    answer:
      "On Laugh Tale, Roger did not uncover a forgotten past but the future: a story that had not happened yet. Because Luffy’s era and the Ancient Weapons had not begun, Roger could only laugh and wait for the right generation to take the helm.",
  },
  {
    question: "Why are the Poneglyphs indestructible?",
    answer:
      "A future alloy would combine Vegapunk’s research with Kozuki stonecraft. And since stones could still be destroyed afterward, their current durability doesn’t lock in their ultimate fate.",
  },
  {
    question: "Why would Emeth recognize Luffy without Luffy knowing him?",
    answer:
      "Emeth remembers a Luffy met later in the adventure, whereas present-day Luffy has not experienced that bond or forged the Haki sealed in the knot yet. They meet at two different points in their shared timeline.",
  },
  {
    question: "How is Teach connected to Davy D. Jones?",
    answer:
      "Teach would be the figure whose legend his bloodline passed down. By fulfilling his promise and ambition to become King of the World, he becomes Davy D. Jones—and Imu may have mistaken his father Xebec for him.",
  },
  {
    question: "What would the One Piece be?",
    answer:
      "It would be tied to the complete story of Luffy’s adventure, uncovered by Roger before the Straw Hats lived it—making Luffy the creator of his own treasure, even though its physical form remains open.",
  },
];

export function getTheoryData(locale: Locale) {
  if (locale === "en") {
    return {
      references: THEORY_REFERENCES_EN,
      centralThesis: CENTRAL_THESIS_EN,
      foundations: THEORY_FOUNDATIONS_EN,
      groups: THEORY_GROUPS_EN,
      faq: THEORY_FAQ_EN,
    };
  }
  return {
    references: THEORY_REFERENCES,
    centralThesis: CENTRAL_THESIS,
    foundations: THEORY_FOUNDATIONS,
    groups: THEORY_GROUPS,
    faq: THEORY_FAQ,
  };
}

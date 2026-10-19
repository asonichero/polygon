# Red

An open-world exploration game on the Polygon engine. Red is an adult in her twenties, living in a fairy-tale village on the edge of a wood, who has shown time and again that she is not ready for the responsibilities of adulthood. The village has known her since birth. Her mother is kind and forgiving, and has also been known to take her in hand when it was needed.

This is the design as it stands. It is written so that the engine's pieces (the shell, the cutscene toolkit, the figures, the world kit, the correction scene) are reused, and so that each milestone ends in something that runs.

## The story

**Prologue (the village and the path).** After one more failure to meet her adult responsibilities, and the consensual correction her mother gives her for it, Red is sent on an errand to make amends: a basket to her grandmother's, through the wood. The handsome stranger who falls into step with her turns her off the path, and by the time she reaches the cottage Granny is frantic with worry. Granny bemoans Red's carelessness and shows her a cloak she has woven, the **Starweave Mantle**, which she hopes will help Red learn to behave better. Red puts it on. Granny gives her another correction. Red goes home in the mantle and tells her mother she wants to be better, and to be held to account.

**Act 1 (the tales).** The mantle lets Red step into stories. She lives a myriad of fairy tales, as the protagonist or as the protagonist's accomplice, and the tale usually ends with a lesson learned through correction from one villager or another. Each lesson lights a star on the mantle.

**Act 2 (the wolf).** Around the middle of the game Red returns to her grandmother's and finds the cottage abandoned. That opens her own story, with the wolf (the enigmatic stranger), which is the overarching plot the tales have been leading to.

## What is different from the pitch, and why

* **Red is an adult in every form, including the small one.** The pitch's chibi sheet shows rounded, big-headed, short-limbed proportions, which read as a child. That is not built. The mantle makes her *small*, not childlike: the same adult body, face and proportions at about half her height (the engine already scales a figure this way: Jack's size slider). Her walk, voice and expressions stay a grown woman's.
* **The corrections stay what the engine already makes them**: consensual, between adult characters, not explicit. The shell keeps its 18+ notice. Red always chooses them (she asks, in the prologue's last scene, to be held to account), and the game has a safe word that stops a scene at once. The engine's safe word is "Red", which is also her name, so the game uses its own, **Briar**.
* Everyone she is corrected by is an adult, and looks it.

**Status:** Red and her mother are ready for the correction viewer: `lap.html?who=red` puts Red in the corrected's place across her mother's lap (the mother is Gerda's model for now) and over the table, with every clothes state, the marks and the engine's pain model, and the game's safe word, Briar.

## The Starweave Mantle

A waist-length red cloak with a hood and gold stars worked along its hem. In the game it is three things:

1. **The record.** It has a star for every tale. A star lights when she has learned a tale's lesson, and the hem shows how far she has come.
2. **The way in.** Wearing it, Red can step into a tale's threshold (a door that was not there, a thread across the path). Taking it off, she is in her own world.
3. **The change.** Putting it on is the transformation scene: the cloak flares, the light gathers, her hair is braided and ribboned, her wardrobe changes to the storybook one (the sheet's green tunic, trousers and boots), the world's colours deepen a little, the music changes key, and she shrinks to about half her height. Her proportions are the adult's at that size, and the world is the same world, now large around her.

## Systems, on the engine

| System | Built on |
|---|---|
| The page, the notice, settings, the pause menu, saving | `js/game.js`, `js/menus.js` (the menu wiring is made generic so a game supplies `build`, `title`, `play`, `stop`) |
| Red, the villagers, their clothes | `js/poly-red.js` and the figures in `js/poly-*.js`, on the one skeleton (`Poly.DIM`) |
| The world: hills, the village, the wood, the paths | `js/red-world.js` (a heightfield, scenery in chunks), with the tile textures and trees in `js/world.js` |
| Walking, jumping, climbing small things, talking, sitting | `js/red-game.js`, after `js/stage.js` |
| Conversations and cutscenes | the toolkit in `js/game.js` (`G.say`, `G.choose`, `G.shot`, `G.fade`) |
| Quests, flags, the stars | `js/red-story.js`: a small state machine with the dialogue as data, saved with `G.save` |
| The correction scenes | `js/lap.js` and `js/pain.js`, made so that the one corrected can be Red and the one correcting a villager (a later milestone) |

## The world

The scale is the figure's: Red is 35 units tall (about 1.7 m), she walks at 26 units a second and runs at about 50, and the world is laid out so that the errand to Granny's is a minute or two of walking. The village sits in a shallow bowl of meadow about 500 units across, with fields to the south and a stream; the wood closes round it on every side, thin at the edge and dark in the middle, and is crossed by paths (the way to Granny's, the way to the fairy-tale places). Beyond the paths the wood is dense enough to mean it. The edge of the playable world is the deep wood, where the paths bend back.

Scenery is built in chunks from a seed as Red nears them and hidden or dropped as she leaves, so the wood can be as large as the game needs without being built at once.

## Milestones

1. **The opening (this one).** The design; Red; the village and the wood; the controller; the story layer; the prologue to the mantle, with the corrections as scene hooks that cut away.
2. **Red takes the corrected's place in the correction scene,** with her mother and Granny as the ones who correct her: the engine's mechanics, the pain model, the safe word, the wardrobe. This needs a Granny and a Mother of their own.
3. **The tale framework and the first three tales,** each a small area with its own cast, a threshold, a lesson, a star.
4. **The village as a place to live in:** the days, the weather, the folk's routines, the small errands that make the village feel known.
5. **Act 2 and the wolf.**

# Climbing Toward Consequence

A blocky, Minecraft-style adult adventure based on *Jack and the Beanstalk*. Jack is 21 and fully adult; Gerda, the "Giantess", is in her late thirties. Rather than the giant and her castle being oversized, **Jack shrinks on arrival** and is measured by how he behaves in her castle: theft, carelessness and lies shrink him; honesty, care and effort restore him. A third-person adventure of climbing, stealth, task-based puzzles and dialogue choices, planned as 10 levels and 4 short playable beats with cutscenes between them, ending with Jack carrying the golden hen home as a gift rather than a theft.

Everything is rendered in the same blocky style (three.js, no build step, procedural pixel textures and synthesised sound, no asset files). It installs as a mobile web app. Nothing from the older Birchwood House game is used here.

## Status

Built so far, in play order: the **Prologue** (the opening); **Chapter One, "Market Day"** (the cow, the market road and the Peddler's cart, the night scene, the correction in three tones, and planting the beans); and **Chapter Two, "The Climb"** (the waking cutscene, dressing and the knife, and the climb of the beanstalk, to the cloud). Also the character models and wardrobes, the character models and wardrobes, the across-the-lap correction scene, and a test level (the golden hen) that proves the care-and-consequence loop. Next: the beanstalk.

### Prologue: the opening (`game.html`)

1. A content notice and 18+ confirmation (once, remembered), then the **title screen** over a slow aerial drone view of the homestead: a run-down cottage in the hillside, a barren garden, the cowshed with Milky-White, a low stone wall, a gate on a path down the valley.
2. **New Game** begins the cutscene: the camera tracks slowly down to the cottage window, with the sound of a correction in progress heard through the wall, then fades to the cottage interior (one room: the hearth at its heart with the pot, kettle and fire iron; the chair and the stool; a small table, a cabinet and store cupboards; undusted corners with a birch-bundle broom; bare stairs to an upstairs we never see).
3. Jack's Mother, by the hearth, finishes lecturing Jack (who stands nursing his bottom) about stretching the truth and shrugging everything off; she softens for a moment, tells him he will sell the cow at market in the morning, and sends him to wash for supper. Fade to black.

### Chapter One: Market Day (`js/market.js`), the first playable sequence: a tutorial in animal care

1. **Outside the cottage**: Mother in the open doorway, Jack facing her in the pale morning light. She sends him to market with the cow, reminds him of the broken compass, doubts him, nods at the cowshed ("Be back before dusk. And mind your manners."), and goes back in; the door closes.
2. **Play**: fetch the cow's **lead** from its hook at the back of the cowshed, then win Milky-White round enough to put it on her. She trusts Jack **90%** to start with. Quick movement near her frightens her exactly as it did the hen in the test level (she backs away and her trust drops by 14); slow, close company calms her; she won't take the lead until she is at **100%**. Sneak (**C**) when you are near her, and wait.
3. **Closing scene**: the lead goes on; Jack, "Come on, girl, we've got a long walk ahead."; a **Continue** button; fade to black. The game saves (including how many times Jack startled the cow, the first of the care scores).

Controls: **WASD** move relative to the camera (Jack turns to go where it points, he does not strafe); **drag** turns the camera angle; **V**, the wheel or the Zoom button cycle three zoom levels (Close, Medium, Far); **C** toggles sneaking, **Shift** runs, **E** acts (use, open, talk), **Q** picks up and puts down, **Q** drops, **Space** jumps (high enough to land on the feed or the trough, which wets Jack's feet and leaves muddy prints for a while) and climbs (the barrel is the only climbable surface here; every object is solid). There is no on-screen hint for jumping, by design. The camera is always centred on Jack, starting slightly above and behind. On a touch screen there is a joystick (walks, camera-relative) and Zoom, Sneak, Use, Drop and Jump buttons, and any other touch drags the camera.

Dialogue is typed out with a babbling voice; a tap, space or Enter finishes the line and moves on, dialogue also advances itself (a setting), and **Skip scene** jumps to the end. Settings hold the volumes (music defaults to 25%), dialogue speed and the safe-word reminder. The game saves after the opening, and Continue picks it up.

| File | What it is |
|---|---|
| `game.html`, `js/menus.js` | The shell: notice, title, settings, saves |
| `js/game.js` | The cutscene toolkit: camera shots, fades, timed waits, typed dialogue, skipping |
| `js/opening.js` | The opening scene itself, as an async script |
| `js/market.js` | Chapter One (first part): the doorway scene, the cow-wrangling play, the closing scene |
| `js/night.js`, `js/correction.js`, `js/garden.js` | Chapter One (close): the night scene, the correction (humble / cheeky / brash), and planting the beans |
| `js/chapter3.js`, `js/climb.js` | Chapter Two: the waking cutscene and the dress-and-knife stretch; the climb of the beanstalk, to the cloud |
| `js/road.js` | Chapter One: the winding market road, the three obstacles, the Peddler's cart and the trade |
| `js/farm.js` | The homestead and the cottage interior, built from textured boxes |
| `js/audio.js` | Music, ambience, smacks, voices and the speech babble, all synthesised |

## Run it

```
npm run serve        # http://localhost:8123/ opens the level
npm test             # pain model and file checks
```

## Layout

| File | What it is |
|---|---|
| `level.html`, `js/level.js` | The test level, "The Golden Hen" (below) |
| `lap.html`, `js/lap.js`, `js/lap-poses.js` | The across-the-lap correction scene and its pose editor |
| `blocky.html`, `js/blocky.js` | The two character models (Jack, Gerda), their skins and wardrobes |
| `js/cast.js` | The supporting cast: Jack's mother, the peddler (Gerda in disguise) and the merchant |
| `js/pain.js` | The pain model behind the correction |
| `manifest.webmanifest`, `sw.js`, `icons/` | The installable web app |
| `vendor/` | three.js r128 and OrbitControls |
| `tests/` | `node --test` checks |

## Blocky models

`blocky.html` (script: `js/blocky.js`) is a separate prototype for a new, Minecraft-style direction: Jack (21) and Gerda, the Giantess
(late 30s), as box-built characters with hand-painted 64×64 skins (base + outer layer; arms are 3×3 pixels, a little thinner than Minecraft's). Legs are
split at the knee, so the bend only shows when seated. Open it from the same static server, `http://localhost:8765/blocky.html`.

### Chapter One, continued: the market road (`js/road.js`), a tutorial in leading, carrying and tying off

Jack leads Milky-White (trust starts at 100%) along a long, winding forest road, the trees leaning in overhead. She follows at a walk; **running** costs her trust and she drags on the lead, until at **60%** she plants her hooves. Standing close does **not** win her back here: **E** beside her (and not by a tying-off tree) lets Jack say something soothing, **+15%** (a short cool-down). Three obstacles block the road to *her* but not to Jack, who can hop over (Space): a fallen limb, rocks, crates. Tie her to the marked tree beside the road (**E** at the tree, she must be close to it), pick the obstacle up (**E**; hands must be free, so the lead is off), put it down (**Q** or **E**) somewhere clear of the road, untie her (**E** at the tree) and go on. Carrying slows Jack and stops him running and jumping. At the end, the Peddler's crooked cart (cloth, bottles, strange feathers, spools of silver thread) and a short dialogue tree in Jack's voice (cocky, hopeful, sure his luck is about to turn); the choices are 1 to 3 or a click, and every branch ends with the trade of the cow for five beans. The choices and care figures are saved.

### The supporting cast (`js/cast.js`, shown in `blocky.html`)

All adults, on the same blocky rig as Jack and Gerda. Sizes: an ordinary adult (Jack at full size, his mother, the merchant, the peddler) is 0.95 of the model's scale; Gerda at full size is 1.0, about 105% of them.

- **Jack's Mother** (close to Gerda in age): lightly greying blonde hair in a tight bun, a faded blue-grey shawl drawn tight round her shoulders and knotted at the breast bone, a linen apron, sleeves rolled to the forearm, stout shoes, eyes sharper than frost and thin lips that press thinner when she disapproves (`rig.setExpr(0|1)`: neutral, or pressed lips, pinched corners and a frown). She is a giver like Gerda: the lap viewer's **Who gives** buttons seat her in the chair (`lap.giver('mother', expr)`).
- **The Peddler** is Gerda in disguise: her own model under a hooded cloak that covers her hair and clothes, her hair dyed fully grey and her lips left natural, an ordinary adult's size (she grows to her own size when unmasked), a muddy hem, patches, a pedlar's pack, and a shadow across her brow. `rig.unmask()` takes the cloak off to show Gerda in her Work clothes, `rig.mask()` puts it back.
- **The Merchant** (for later in the story): weather-worn, bright-eyed, as tall as Jack at full size, a cloak of indigo wool dusted with stardust that twinkles (call `rig.tick(dt)` each frame), a leather satchel at his hip with golden trinkets showing. Never used in the correction scenes.

### Across the lap (`lap.html`, `js/lap.js`, `js/pain.js`)

The one discipline scene kept for this direction: Gerda gives, Jack receives, across her lap on a plain chair. The mechanics are the
game's own, ported:

- **Smack / Run / Stop / End**, with **Pace** and **Strength** steps (Space smacks); a smack is a lift, a hold with the arm raised (that wait builds dread), the strike and a short
  hold on the skin (which keeps stinging).
- The **pain model** (`js/pain.js`) turns each smack into Jack's **distress**; its bands (composed, flinching, struggling, close to
  the edge, past it, too harsh) drive his kicks and wriggling and his face (four expressions, repainted into his skin). At 1.5 it is too harsh and nothing more is struck.
- **Implements**: the hand (landed with the end of Gerda's forearm, on the middle of one cheek at a time) and a small rounded paddle held out from the face of her arm block that looks toward his head in the top view, face down, landing on one cheek at a time (it alternates with the hand's colour); each with the engine's weight and sting. 
- **Clothes**: trousers up or down, and drawers up or down (with the trousers down). Cloth over the rear cushions the sting only, as in the engine.
- **Marks**: the bare rear colours up with the smacks, cheek by cheek, and tender skin hurts more.
- **Red**: the safe word stops everything at once.
- Cameras: Overview, Behind, Over your shoulder (Gerda's view), Face; drag to orbit as well.

Gerda's swinging (right) arm has an elbow (an upper arm and a forearm, cut like the legs at the knee) and a wrist twist, and the swing is solved geometrically: her torso never twists or leans for a strike (so a pose edit of it stays put). The hand's end lands exactly on the middle of the cheek being struck; the paddle's mount on the forearm is placed so its blade's middle lies on the cheek being struck, the elbow bending more for the nearer cheek and for a smaller Jack, the blade lying toward his head and rolled about its length to the angle of his glutes at contact. Which cheek takes the colour still alternates. At rest (between runs and single smacks) the hand or paddle hovers over the centre of his lower back, at any size of Jack (the right arm's rest pose is aimed, so edits to the right arm's bones at the rest beat are ignored).
Jack's size (50–100%, where 100% is 95% of the model's own scale) is a slider in the lap viewer (50% is the lowest this position works at, and there are two sets of Gerda's poses, made at 100% and at 50%, that blend between as he scales, so the contact sites always work; the pose editor edits one set at a time, holding Jack at that size): his body is scaled about his hip joint and re-seated on her lap, so the premise (he shrinks on arrival and regains his size level by level) can be previewed. The contact sites are on his body, so they move and shrink with him, and the aim is refitted each frame (the blade's height counts most in the fit) so the paddle always lies on his skin. The pain model does not yet change with his size.


#### Pose editor (lap viewer)

`lap.html` ▸ **Edit poses** holds the scene at a beat and lets you lay offsets on any bone, live: Gerda's poses for each implement in hand (Hand and Paddle, each with rest, raised, contactL and contactR: the contact pose belongs to the cheek struck), and Jack's base pose and his full reaction (added in proportion to how hard a smack lands). You can also **click and drag the joint handles in the view**: yellow spheres swing a bone so the joint at its far end follows the cursor (e.g. the right elbow handle swings the upper arm, the right hand handle bends the elbow), cyan cubes move a bone, pink diamonds twist it (the wrist twist, the paddle's roll); the selected one is white, and the sliders show the same numbers. Rotation is in degrees, position in units; Jack's `frame` moves his whole body on her lap and `glutes` is the block. Offsets sit on top of the procedural pose (so her reach still adapts). **Nothing is stored in the browser**: press **Report**, then paste it into `js/lap-poses.js` (or into the chat).

#### Wardrobe

Jack has **Outdoor** (linen shirt, green jerkin, patched trousers, boots), **Day** (a soft green tunic with wooden buttons, hem brushing the tops of his thighs, over plain snug shorts, barefoot), **Soft** (a cornflower tunic, softer, with a small pocket sewn on the front, over cornflower shorts short enough to show his knees, barefoot) and **Fine** (the outdoor clothes dressed up: a deep green jerkin edged in gold, clean breeches with a gold seam, polished boots with brass buckles). In the lap scene the tunic is lifted clear of his seat, so his shorts or trousers, drawers or bare skin show as before. Gerda has **Work** (plum bodice, a bibless apron tied at the waist, ankle-length skirt, barefoot) and **Fine** (barefoot, gold anklets hung with small bells and moonstones, a lavender gown with cream embroidery falling to mid-calf, 3/4 sleeves, bracelets to match the anklets). Pick them in the Wardrobe section of `lap.html` and `blocky.html`; `Blocky.OUTFITS` lists them and `Blocky.paintGerdaInto(skin, 'Fine')` repaints her skin.

### Test level: the golden hen (`level.html`, `js/level.js`)

Gerda has gone out and left Jack (Day clothes, starting at **80%** of his size) looking after her golden hen. He must **sweep the floor** (take the broom, hold Space over the dirt), **fill the hen's dish** (grain from the sack), **carry water to the trough without spilling it** (bucket from the floor by the broom, filled from the always-full basin (the old well); hold Shift to creep, or it slops), and **win the hen's trust** by approaching slowly and keeping still near her (move fast near her and she backs away). WASD or the arrows walk, **Shift** (hold) runs, **C** toggles sneaking, **E** picks up and drops anything (the broom, bucket, grain and the hen herself; next to the rack or well it puts them back, otherwise they stay where he stands), and sits on the chair. **Space** claps if his hands are free (or strokes the hen once she trusts him fully), and uses what he holds: hold it to sweep with the broom; at the dish it fills it; at the well it fills the bucket; at the trough it pours; anywhere else water or grain is dumped on the floor, which makes a new patch of dirt (and spilled water costs size). Holding the hen drains her trust as fast as a clap, every second. **G** calls Gerda back early, and buttons at the bottom right do all of these. On a phone or tablet the page is responsive: a joystick (bottom left) walks, any other touch drags the view, and the buttons do the rest (the ? button shows the help). The camera is locked behind Jack's head (an experiment: the `LOCK_CAM` constant in `js/level.js` turns it off) and the player can only tilt it up and down by dragging; A/D (or the stick left/right) turn Jack and W/S (stick up/down) walk him forwards and back. The level opens with Jack facing Gerda in the doorway while she tells him what she expects. (Before, dragging the mouse looked around Jack (the camera keeps a fixed distance in Jack's own sizes, so the room seems to grow as he shrinks). The room is square, with packed-earth floor, built at Gerda's size; the hen is half size and starts at 50% trust, and only reacts to Jack's pace within about 28 units of her. The hen roams the whole room. Placed in her nest (E to pick her up and drop her there) or driven towards it, she settles in the centre of it and rests for at least 5 seconds plus 2 more for every 10% of her trust (fast movement no longer bothers her), so the more unsettled she is, the sooner she gets up; anywhere within the nest counts as placing her, and with Jack in or beside the nest Space settles her, raising her trust, and at 100% she stays in her nest. Muddy footprints (Jack's or the hen's) can be swept like dirt. The same chair that stands in the correction scene is against the north wall: Jack sits patiently at 95%, and kicks his feet more and more as he shrinks towards 50%. The correction happens in the middle of the room exactly as he left it, with the hen settled in her nest. During the correction Gerda and Jack talk between short bursts of smacks, and Jack cries out (a synthesised voice that is higher, longer and more broken as his distress rises). The camera may pass through the walls; a wall it has gone through is not drawn, so the room stays visible. During the correction his distress never falls and the colour never fades: a Firm correction ends close to the edge of his composure, and a Severe one takes him past it (about 1.3, past the edge of resistance, without being too harsh). Gerda judges only the state the room is left in (dirt and footprints still there, spilled water or grain left as dirt, an empty dish or trough, things left lying about, the hen's final temperament), not how he got there: claps, startles, spills he cleaned up and dawdling do not count towards the correction. The talk never pauses the smacks: lines are tied to the smack count and spoken as the hand keeps falling; Gerda pauses only between stages (baring Jack, and producing the paddle). Things fixed to a wall (the door frame and its light, the window and the crate and shelf tower, the broom rack) are left out along with the wall once the camera has gone through it. Dragging sideways turns Jack and the view with him, as an alternative to A/D. In the aftermath the same camera rules apply, pinned to his glutes: it starts behind him, a vertical drag tilts it and a horizontal one swings it round him, and walls it passes through are left out.

His size never goes below **50%**. What makes him shrink (percentage points of his full size):

| Cause | Cost |
|---|---|
| Clapping to shoo the hen | 3% |
| Lying to Gerda about how it went | 5% (a flat cost, not a reset) |
| Spilling the water (each 15 units lost, or dropping the bucket) | 2% |
| Startling the hen (moving too fast near her, at most once every 4 s) | 1% |
| Each chore still undone when Gerda comes back | 2% |
| Not finished when the 4-minute clock runs out | 2% |
| The broom or bucket left lying about instead of put back (each) | 1% |

A spotless job (nothing undone, nothing broken, no lie) earns no correction at all: Gerda ruffles his hair and calls him a good boy. After the correction a scene shows Jack facing the wall with his bottoms and drawers down and Gerda standing behind him, with a short summary window at the bottom (smacks, and what he was disciplined for: spilled water only counts if left as dirt, and the hen's final temperament is recorded, not each startle). The colour on his bottom slowly fades with time. Anything else earns at least a Light one (severity is stricter than before), and her lecture happens in the room, before a fade to black loads the correction. When the chores are done (or time is up) Gerda (Work clothes) walks in and asks how it went: Jack can tell her exactly what happened, or say it all went perfectly (which is only a lie if it didn't, and then costs 5%). A scripted correction follows across her lap (`js/lap.js`), run with Jack at the size he ends at (a smaller Jack feels the same hand a little more). Its severity comes from how he really did (undone chores 2 each, spills 1.5, startles 0.5, claps 1, running late 1) and then whether he lied: Token, Light, Firm (shorts come down part-way), Severe (hand, then the paddle, bare for the last of it); a lie lifts it one tier. "Red" stops it on the spot.

### Installing the level as a mobile web app

`level.html` is an installable web app (a PWA): `manifest.webmanifest` (fullscreen, landscape, the golden-hen icons in `icons/`), `sw.js` (caches the game's files on first load, so it starts instantly and plays offline) and the head tags in `level.html` (including the Apple ones). It needs to be served over HTTPS (or localhost): any static host works (GitHub Pages, Netlify, Vercel). On Android and desktop Chrome an **Install app** button appears (or use the browser menu: Install / Add to Home screen); on iOS Safari use Share, then Add to Home Screen. When you change any file, bump `VERSION` in `sw.js` so installed copies refresh. If you add files the game needs, add them to the `FILES` list there.

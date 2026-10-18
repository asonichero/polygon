# Polygon

A low-poly engine in the style of the Nintendo 64 and the PlayStation, built around two characters: **Jack** (21) and **Gerda** (late thirties), both adults. It is the engine that was left when the story (*Climbing Toward Consequence*, a Jack-and-the-Beanstalk game) had its maps, chapters and cutscene beats taken out, with the blocky Minecraft-style models replaced by jointed, textured, vertex-lit polygon models of the kind Ocarina of Time and Final Fantasy VII used.

Everything is three.js (r128, vendored), plain scripts, no build step, no asset files: the geometry is built in code, the textures are painted in code, the sound is synthesised. It installs as a mobile web app. The old story is not lost: it is in the git history (`387fd78`, "Import consequence project at repo root").

## Run it

```
npm run serve        # http://localhost:8123/
npm test             # file checks, the pain model, and a headless build of both figures
```

| Page | What it is |
|---|---|
| `game.html` (`index.html` opens it) | The shell: content notice, title (over a turntable of Jack and Gerda), settings, pause menu, and the **Sandbox** |
| `models.html` | The model viewer: poses, outfits, expressions, clothes, marks, wireframe, the atlases, the retro look |
| `lap.html` | The correction scene and its pose editor |

## The models

About 1,800 triangles for Jack and 2,200 for Gerda (OoT's adult Link was a little over that), each a stack of **rigid segments on a joint skeleton**, as the consoles did it: a head, a neck, a torso, a pelvis, two arms of upper arm and forearm and hand, two legs of thigh and shin and foot. A ball or a dome caps every joint so a bend never opens a gap. Shapes are lofted from hand-placed rings (8-sided limbs, 12-sided torso and head), shaded per vertex (Gouraud, through a plain `MeshLambertMaterial`), and textured from one **128×128 atlas** per figure, painted pixel by pixel in the code and sampled with nearest filtering.

* **Faces are texture swaps**, the way the era did them: the head is a grid whose front 120° is a flat face plate mapped straight on from the front; an expression repaints that plate (eyes, brows, mouth, blush).
* **Jack** has eight named faces (`grin`, `wince`, `gritted`, `crying`, `squint`, `cheeky`, `shy`, `smile`) and four outfits: `Outdoor` (linen shirt, green jerkin, patched trousers, boots), `Day` (a soft green tunic over snug shorts, barefoot), `Soft` (a cornflower tunic with a pocket, barefoot), `Fine` (the outdoor clothes dressed up). Trousers and drawers come up and down, and the bare skin takes **marks** cheek by cheek.
* **Gerda** has three faces (`calm`, `stern`, `laughing`) and two outfits: `Work` (plum bodice laced over a blouse, bibless apron, ankle-length skirt) and `Fine` (a lavender embroidered gown with gold bracelets and anklets). Her skirt is a flared tube round each leg, under a waist piece, so it drapes over her knees when she sits.
* Both are drawn proportioned as grown people, a head about a seventh of their height with the chunky hands and feet of the style.

```js
const jack = Poly.makeJack(), gerda = Poly.makeGerda('Work');
jack.paint({ outfit: 'Day', trousers: 'down', drawers: 'down', marks: { L: 0.4, R: 0.6 }, expr: 'wince', hitched: true });
gerda.paint({ outfit: 'Fine', expr: 'stern' });   // repaints only the sheets that changed
Poly.setPose(jack, 'sit');                         // 'stand' | 'sit'; Poly.step(rig, dt) eases toward it
```

### The skeleton

The rig is the one the correction scene was tuned on, joint for joint, so all of its poses still apply: a standing figure is 32 units tall; the hips sit 12 up; the torso is 12 tall with the neck at its top; the shoulders are 10 up it and 5.5 out; an arm is an upper arm of 4 and a forearm of 6 (the hand's end is 10 below the shoulder); a leg is a thigh of 6 and a shin of 6. A rig is `{ root, hips, torso, pelvis, neck, armL/armR (shoulder pivots), elbowL/wristL, elbow/wrist (the right arm), legL/legR: { thigh, knee, shin, foot, sign, ring }, state, target, apply, after, paint(state), stretchShins(k) }`. A scene adds its own motion by setting `rig.after = r => { … }`, which runs at the end of every `apply`.

### Files

| File | What it is |
|---|---|
| `js/poly-geo.js` | The toolkit: `Atlas` and `Sheet` (a packed texture and its pixel painter), `Grid` and `loft` (rings into smooth tubes with a UV for every vertex), `merge`, small shapes |
| `js/poly.js` | The skeleton, the poses, shared parts (head, hair, hands, feet), the chair and the birch |
| `js/poly-jack.js`, `js/poly-gerda.js` | The two figures: measurements, geometry, and the painters for faces, clothes and marks |
| `js/retro.js` | The picture (below) |

To add a figure or an outfit, copy the pattern in `poly-jack.js`: list the sheets, build the parts on the bones of `Poly.skeleton()`, write a `paint(state)` that repaints what changed, and list the outfit in `Poly.OUTFITS`.

## The picture

`js/retro.js` wraps the renderer: the scene is drawn into a small render target (480, 360 or 240 lines; Native turns it off), drawn up to the screen with hard pixels, and reduced to **15-bit colour with the PlayStation's ordered dither**. Two more switches in Settings: **polygon wobble** snaps every vertex to the low-resolution pixel grid, as the original hardware did, and **smooth pixels** filters the upscale the way the N64 did. Nothing else has to change: `Retro.attach(renderer)` replaces the renderer's own `render`.

## The sandbox

A plain floor, a few things to jump on (crates, a run of steps, a wall), a chair, Gerda, and Jack to walk about as. It exists to show the engine working and has no level in it.

**WASD** (or the stick) moves relative to the camera, Jack turning into the way he goes; **Shift** runs, **C** creeps, **Space** jumps, **E** sits, stands and talks, **drag** turns the camera, **V** or the wheel cycles three zoom levels, **[** and **]** shrink and grow Jack between 50% and 100% (his pace, his jump and the camera's distance follow his size). On a touch screen there is a joystick and buttons for run, creep, jump, act and zoom. The walk is procedural on the rig (swinging thighs, knees that bend through the swing, arms and elbows, a bob, a crouch for creeping, a tucked pose in the air).

## The cutscene toolkit (`js/game.js`)

A cutscene is an async function that awaits the shell's calls; talking to Gerda in the sandbox is an example (`Stage.talk` in `js/stage.js`).

```js
G.cut(spec) / await G.shot(spec, secs, ease)   // the camera: { pos, look, fov }; secs 0 cuts
await G.say('gerda', 'Text.')                    // typed out, with a babbling voice; a tap, space or Enter finishes the line and moves on
G.caption(who, text)                             // a line spoken over the scene while it goes on
const i = await G.choose('jack', ['One', 'Two']) // buttons in the dialogue box, or the keys 1 to 9
await G.fade(true, 1); await G.wait(2)
```

Skipping sets a flag that makes every wait, line and move finish at once, so a scene can be skipped and still land on the right frame. With `?debug` the shell shows pause, back-a-beat and on-a-beat controls (a beat is one camera angle). `G.save(data)` / `G.loadSave()` keep a saved game; settings (volumes, dialogue speed, the picture) are kept for you.

## The correction scene (`lap.html`, `js/lap.js`, `js/pain.js`)

Gerda gives, Jack receives, across her lap on a plain chair, or bent over a table. The mechanics are the engine's own:

* **Smack / Run / Stop / End**, with **Pace** and **Strength** steps (Space smacks); a smack is a lift, a hold with the arm raised (that wait builds dread), the strike and a short hold on the skin (which keeps stinging).
* The **pain model** (`js/pain.js`) turns each smack into Jack's **distress**; its bands (composed, flinching, struggling, close to the edge, past it, too harsh) drive his kicks and wriggling and his face. At 1.5 it is too harsh and nothing more is struck.
* **Implements**: the hand, landed with the end of Gerda's forearm on the middle of one cheek at a time; a small rounded paddle held out from her forearm; the birch (for the table). Each has its own weight and sting.
* **Clothes**: trousers up or down, and drawers up or down. Cloth over the rear cushions the sting only.
* **Marks**: the bare rear colours up with the smacks, cheek by cheek, and tender skin hurts more.
* **Red**: the safe word stops everything at once.
* Cameras: Overview, Behind, Over your shoulder, Face and a set for the table; drag to orbit as well.
* **Jack's size** (50–100%): a slider; the contact sites are on his body, so they move and shrink with him, and two sets of poses (made at 100% and at 50%) blend between so the hand always lands.
* **Wardrobe** for both; **Gerda's face** (calm, stern, laughing).
* **Arm poses** over the knee: reaching back for his belt, and pinned behind him with Gerda holding his wrist.

Her swinging arm is solved geometrically (an elbow, a wrist twist): her torso never twists or leans for a strike, the hand's end lands on the cheek being struck, the paddle's blade lies across it and is rolled to the angle of his seat. Offsets tuned by hand sit on top of the procedural pose.

### Pose editor

`lap.html` ▸ **Edit poses** holds the scene at a beat and lets you lay offsets on any bone, live, with sliders or by dragging the joint handles in the view (yellow spheres swing a bone, cyan cubes move it, pink diamonds twist it). **Nothing is stored in the browser**: press **Report**, then paste it into `js/lap-poses.js`. The skeleton the poses were tuned on is unchanged, so the existing ones apply to the new models; the contact sites (the two cheeks of Jack's seat) are built where the old block's were.

## Installing as a mobile web app

`manifest.webmanifest` (fullscreen, landscape), `sw.js` (caches the files on first load, so it starts instantly and plays offline) and the head tags in `game.html`. It needs to be served over HTTPS (or localhost): any static host works. On Android and desktop Chrome use the browser menu (Install / Add to Home screen); on iOS Safari use Share, then Add to Home Screen. When you change any file, bump `VERSION` in `sw.js` so installed copies refresh; if you add files the game needs, add them to the `FILES` list there (a test checks both pages and worker agree).

## Content

Polygon is an adult engine: the correction scene shows consensual adult discipline (spanking) between adult characters, with some nudity from the waist down. The shell asks for an 18+ confirmation once and remembers it.

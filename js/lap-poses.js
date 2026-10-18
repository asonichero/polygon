// Beanstalk — Across the lap: pose edits. Offsets (degrees, and units for position) laid on top of the procedural pose of each bone, per beat.
// Two sets, made with Jack at 100% and at 50% of his size; at any size between, the offsets are blended between them (so the contact sites
// always work). 50% is the lowest size these poses work at.
// Gerda's poses, for each implement in hand ('hand', 'paddle'): 'rest' (between smacks), 'raised' (the arm up, about to strike) and 'contactL' /
// 'contactR' (landed on the left or right cheek); they blend as the swing moves. Jack's: 'base' (always on) and 'react' (added in proportion to
// his reaction to a smack). Bones: Gerda and Jack torso, neck, thighL, thighR, kneeL, kneeR (the arms are not here: they are reached by their own joints), paddle and birch, and (the forearm's own twist, and
// the forearm, hand and paddle mount moved as a unit), paddle; Jack the same without the paddle, plus glutes (the block) and frame (his
// whole body on her lap).
// An entry is { r: [x, y, z] degrees, p: [x, y, z] units }. r is absolute: the joint's own angles from its standing position (in its own order: torso YXZ, arms and thighs ZXY, the rest XYZ), within the joint's range (js/lap.js, LIMITS); a bone with no r keeps its procedural
// pose. p is how far the part has moved from where it stands (only the torso, Jack's whole body, his glutes block and the implements move). The lap viewer's pose editor prints a report in exactly this form (Pose editor ▸ Report): paste it over this file. Nothing else writes to it.
(function (root) {
'use strict';
root.LapPoses = {
  100: {
    gerda: {
      hand: {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          birch: { r: [0, 0, 0] },
          armR: { r: [-65, -20, -110] },
          elbowR: { r: [-70, 30, 10] },
        },
        raised: {
          torso: { r: [-7.9, -2.5, -0.9], p: [0, 0, -0.5] },
          armR: { r: [9, -82, -110] },
          elbowR: { r: [-70, -38, 0] },
          paddle: { r: [-3.8, 0, 90] },
          wristR: { r: [-4.9, 23.5, 6.9] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          elbowR: { r: [-89.6, -4.4, -10] },
          armR: { r: [-15.2, 17.8, -82.2] },
        },
        contactR: {
          torso: { r: [-1, 9, 6], p: [0, 0, -0.5] },
          elbowR: { r: [-18.5, 6.9, 1.6] },
          armR: { r: [-61.5, 5.7, -100.6] },
          wristR: { r: [0, -43.1, 0] },
        },
      },
      paddle: {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [-165, -1.1, 91.2] },
        },
        raised: {
          torso: { r: [-8, 0, 0], p: [0, 0, -0.5] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [173.7, 8, 90] },
        },
        contactR: {
          torso: { r: [2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [160.2, 7.5, 92.7] },
        },
      },
      birch: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      'hand~reach': {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          birch: { r: [0, 0, 0] },
          armR: { r: [-65, -20, -110] },
          elbowR: { r: [-70, 30, 10] },
        },
        raised: {
          torso: { r: [-7.9, -2.5, -0.9], p: [0, 0, -0.5] },
          armR: { r: [9, -82, -110] },
          elbowR: { r: [-70, -38, 0] },
          paddle: { r: [-3.8, 0, 90] },
          wristR: { r: [-4.9, 23.5, 6.9] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          elbowR: { r: [-89.6, -4.4, -10] },
          armR: { r: [-15.2, 17.8, -82.2] },
        },
        contactR: {
          torso: { r: [-1, 9, 6], p: [0, 0, -0.5] },
          elbowR: { r: [-18.5, 6.9, 1.6] },
          armR: { r: [-61.5, 5.7, -100.6] },
          wristR: { r: [0, -43.1, 0] },
        },
      },
      'hand~hold': {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          birch: { r: [0, 0, 0] },
          armR: { r: [-65, -20, -110] },
          elbowR: { r: [-70, 30, 10] },
        },
        raised: {
          torso: { r: [-7.9, -2.5, -0.9], p: [0, 0, -0.5] },
          armR: { r: [9, -82, -110] },
          elbowR: { r: [-70, -38, 0] },
          paddle: { r: [-3.8, 0, 90] },
          wristR: { r: [-4.9, 23.5, 6.9] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          elbowR: { r: [-89.6, -4.4, -10] },
          armR: { r: [-15.2, 17.8, -82.2] },
        },
        contactR: {
          torso: { r: [-1, 9, 6], p: [0, 0, -0.5] },
          elbowR: { r: [-18.5, 6.9, 1.6] },
          armR: { r: [-61.5, 5.7, -100.6] },
          wristR: { r: [0, -43.1, 0] },
        },
      },
    },
    jack: {
      hand: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      paddle: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      birch: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      'hand~reach': {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      'hand~hold': {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
    },
  },
  50: {
    gerda: {
      hand: {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [172.4, 0, 90] },
          armR: { r: [-17, 4, -22] },
          elbowR: { r: [-68.7, 1, 1.1] },
        },
        raised: {
          torso: { r: [-7.9, -2.5, -0.9], p: [0, 0, -0.5] },
          armR: { r: [13.8, -62.1, -82.8] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          armR: { r: [-21, 6.8, -7.9] },
          elbowR: { r: [-81.5, 0.9, 2.4] },
          wristR: { r: [0, 45.6, 0] },
        },
        contactR: {
          torso: { r: [-2, 3, 8], p: [0, 0, -0.5] },
          armR: { r: [-62, 37, -18] },
          elbowR: { r: [-40.3, 6.4, -0.1] },
          wristR: { r: [0, 20, 0] },
        },
      },
      paddle: {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [-14.7, 1, 92], p: [0, 1, 0] },
        },
        raised: {
          torso: { r: [-8, 0, 0], p: [0, 0, -0.5] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [155.2, 7, 93.8] },
        },
        contactR: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [141.5, 0.9, 91.8], p: [0, 1, 0] },
        },
      },
      birch: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      'hand~reach': {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [172.4, 0, 90] },
          armR: { r: [-17, 4, -22] },
          elbowR: { r: [-68.7, 1, 1.1] },
        },
        raised: {
          torso: { r: [-7.9, -2.5, -0.9], p: [0, 0, -0.5] },
          armR: { r: [13.8, -62.1, -82.8] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          armR: { r: [-21, 6.8, -7.9] },
          elbowR: { r: [-81.5, 0.9, 2.4] },
          wristR: { r: [0, 45.6, 0] },
        },
        contactR: {
          torso: { r: [-2, 3, 8], p: [0, 0, -0.5] },
          armR: { r: [-62, 37, -18] },
          elbowR: { r: [-40.3, 6.4, -0.1] },
          wristR: { r: [0, 20, 0] },
        },
      },
      'hand~hold': {
        rest: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          paddle: { r: [172.4, 0, 90] },
          armR: { r: [-17, 4, -22] },
          elbowR: { r: [-68.7, 1, 1.1] },
        },
        raised: {
          torso: { r: [-7.9, -2.5, -0.9], p: [0, 0, -0.5] },
          armR: { r: [13.8, -62.1, -82.8] },
        },
        contactL: {
          torso: { r: [-2, 0, 0], p: [0, 0, -0.5] },
          armR: { r: [-21, 6.8, -7.9] },
          elbowR: { r: [-81.5, 0.9, 2.4] },
          wristR: { r: [0, 45.6, 0] },
        },
        contactR: {
          torso: { r: [-2, 3, 8], p: [0, 0, -0.5] },
          armR: { r: [-62, 37, -18] },
          elbowR: { r: [-40.3, 6.4, -0.1] },
          wristR: { r: [0, 20, 0] },
        },
      },
    },
    jack: {
      hand: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      paddle: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      birch: {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      'hand~reach': {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
      'hand~hold': {
        rest: {},
        raised: {},
        contactL: {},
        contactR: {},
      },
    },
  },
  table: {
    100: {
      gerda: {
        hand: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        paddle: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        birch: {
          rest: {
            torso: { r: [-0.6, -9.5, 0.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [-76.1, 17, 15.6] },
            neck: { r: [10.2, 26.9, -2] },
            armR: { r: [-6.6, -2.3, -3.6] },
            elbowR: { r: [5, -0.2, 0] },
            wristR: { r: [0, -6.5, 0] },
          },
          raised: {
            torso: { r: [-0.6, -16.5, 0.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [-90.6, 14.5, -9.7] },
            armL: { r: [-13.9, 0.4, 5.1] },
            armR: { r: [31.8, 5.3, -80.4] },
            elbowR: { r: [-52.5, -8.9, 0] },
            wristR: { r: [0, -75.6, 0] },
          },
          contactL: {
            torso: { r: [7.4, 32.5, 7.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [37, 19.6, 54.7] },
            neck: { r: [5.7, -28, 0] },
            armL: { r: [11.1, -0.7, 8.8] },
            armR: { r: [14.2, -90, -8.2] },
            elbowR: { r: [5, 0, 0] },
            wristR: { r: [0, 0, 0] },
          },
          contactR: {
            torso: { r: [7.4, 32.5, 7.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [37, 19.6, 54.7] },
            neck: { r: [5.7, -28, 0] },
            armL: { r: [11.1, -0.7, 8.8] },
            armR: { r: [14.2, -90, -8.2] },
            elbowR: { r: [5, 0, 0] },
            wristR: { r: [0, 0, 0] },
          },
        },
        'hand~reach': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        'hand~hold': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
      },
      jack: {
        hand: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        paddle: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        birch: {
          rest: {
            frame: { p: [-11.5, 0, 0] },
            neck: { r: [-38.7, -1.2, 0.2] },
            armL: { r: [-27.5, 90, 110] },
            armR: { r: [-27.6, -90, -110] },
          },
          raised: {
            frame: { p: [-11.5, 0, 0] },
            neck: { r: [-38.7, -1.2, 0.2] },
            armL: { r: [-27.5, 90, 110] },
            armR: { r: [-27.6, -90, -110] },
          },
          contactL: {
            frame: { r: [90, 39.7, -90], p: [-10.4, 0.3, 0.1] },
            neck: { r: [-51.3, -1.2, -0.3] },
            kneeR: { r: [34, 2.2, 0] },
            kneeL: { r: [30.8, -0.3, 0] },
            thighR: { r: [-61.3, 0.5, -5.1] },
            thighL: { r: [-60, -1, 4.5] },
            torso: { r: [5.6, 0, 0.2] },
            armL: { r: [-46.5, 90, 110] },
            armR: { r: [-45, -90, -110] },
          },
          contactR: {
            frame: { r: [90, 39.7, -90], p: [-10.4, 0.3, 0.1] },
            neck: { r: [-51.3, -1.2, -0.3] },
            kneeR: { r: [34, 2.2, 0] },
            kneeL: { r: [30.8, -0.3, 0] },
            thighR: { r: [-61.3, 0.5, -5.1] },
            thighL: { r: [-60, -1, 4.5] },
            torso: { r: [5.6, 0, 0.2] },
            armL: { r: [-46.5, 90, 110] },
            armR: { r: [-45, -90, -110] },
          },
        },
        'hand~reach': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        'hand~hold': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
      },
    },
    50: {
      gerda: {
        hand: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        paddle: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        birch: {
          rest: {
            torso: { r: [-0.6, -9.5, 0.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [-76.1, 17, 15.6] },
            neck: { r: [10.2, 26.9, -2] },
            armR: { r: [-6.6, -2.3, -3.6] },
            elbowR: { r: [5, -0.2, 0] },
            wristR: { r: [0, -6.5, 0] },
          },
          raised: {
            torso: { r: [-0.6, -16.5, 0.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [-90.6, 14.5, -9.7] },
            armL: { r: [-13.9, 0.4, 5.1] },
            armR: { r: [31.8, 5.3, -80.4] },
            elbowR: { r: [-52.5, -8.9, 0] },
            wristR: { r: [0, -75.6, 0] },
          },
          contactL: {
            torso: { r: [7.4, 32.5, 7.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [53.6, 28, 52.6] },
            neck: { r: [5.7, -28, 0] },
            armL: { r: [11.1, -0.7, 8.8] },
            armR: { r: [-17.1, -90, 9.6] },
            elbowR: { r: [5, 0, 0] },
            wristR: { r: [0, 0, 0] },
          },
          contactR: {
            torso: { r: [7.4, 32.5, 7.6], p: [-13.8, 0, -7.6] },
            paddle: { r: [0, 0, 90] },
            birch: { r: [53.6, 28, 52.6] },
            neck: { r: [5.7, -28, 0] },
            armL: { r: [11.1, -0.7, 8.8] },
            armR: { r: [-17.1, -90, 9.6] },
            elbowR: { r: [5, 0, 0] },
            wristR: { r: [0, 0, 0] },
          },
        },
        'hand~reach': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        'hand~hold': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
      },
      jack: {
        hand: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        paddle: {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        birch: {
          rest: {
            frame: { p: [-11.5, 0, 0] },
            neck: { r: [-38.7, -1.2, 0.2] },
            armL: { r: [-44.1, 90, 110] },
            armR: { r: [-44, -90, -110] },
          },
          raised: {
            frame: { p: [-11.5, 0, 0] },
            neck: { r: [-38.7, -1.2, 0.2] },
            armL: { r: [-44.1, 90, 110] },
            armR: { r: [-44, -90, -110] },
          },
          contactL: {
            frame: { r: [90, 58.8, -90], p: [-10.4, 0.3, 0.1] },
            neck: { r: [-51.3, -1.2, -0.3] },
            kneeR: { r: [34, 2.2, 0] },
            kneeL: { r: [30.8, -0.3, 0] },
            thighR: { r: [-42.2, 0.3, -5.3] },
            thighL: { r: [-40.9, -0.5, 4.9] },
            torso: { r: [5.6, 0, 0.2] },
            armL: { r: [-62.1, 90, 110] },
            armR: { r: [-59.7, -90, -110] },
          },
          contactR: {
            frame: { r: [90, 58.8, -90], p: [-10.4, 0.3, 0.1] },
            neck: { r: [-51.3, -1.2, -0.3] },
            kneeR: { r: [34, 2.2, 0] },
            kneeL: { r: [30.8, -0.3, 0] },
            thighR: { r: [-42.2, 0.3, -5.3] },
            thighL: { r: [-40.9, -0.5, 4.9] },
            torso: { r: [5.6, 0, 0.2] },
            armL: { r: [-62.1, 90, 110] },
            armR: { r: [-59.7, -90, -110] },
          },
        },
        'hand~reach': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
        'hand~hold': {
          rest: {},
          raised: {},
          contactL: {},
          contactR: {},
        },
      },
    },
  },
};
})(typeof window !== 'undefined' ? window : globalThis);

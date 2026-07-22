https://overpass-turbo.eu/

---

[out:json];
(
  way['highway']
  ['highway' !~'pedestrian']
  ['highway' !~'footway']
  ['highway' !~'cycleway']
  ['highway' !~'path']
  ['highway' !~'service']
  ['highway' !~'corridor']
  ['highway' !~'track']
  ['highway' !~'steps']
  ['highway' !~'raceway']
  ['highway' !~'bridleway']
  ['highway' !~'proposed']
  ['highway' !~'construction']
  ['highway' !~'elevator']
  ['highway' !~'bus_guideway']
  ['highway' !~'private']
  ['highway' !~'no']
  ({{bbox}});
);
out body;
>;
out skel;

---

Export as raw OSM data

---

{
  "version": 0.6,
  "generator": "Overpass API 0.7.62.11 87bfad18",
  "osm3s": {
    "timestamp_osm_base": "2026-07-21T20:16:41Z",
    "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
  },
  "elements": [
    {
      "type": "way",
      "id": 46045722,
      "nodes": [
        390445287,
        587091529
      ],
      "tags": {
        "bridge": "yes",
        "highway": "secondary",
        "lanes": "3",
        "layer": "1",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 46045726,
      "nodes": [
        587091882,
        587091884
      ],
      "tags": {
        "bridge": "yes",
        "highway": "secondary",
        "lanes": "3",
        "layer": "1",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169636224,
      "nodes": [
        1808065052,
        1808065242,
        1808065255,
        1808065290,
        1808065293,
        1808065158,
        1808065187,
        1808065232,
        1808065192,
        1808065186,
        1808065190,
        1808065178,
        1808065155,
        1808065152,
        1808065080,
        1808065333,
        1808065329,
        1808065324,
        8594513620
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 340518577,
      "nodes": [
        3477544188,
        3477543955,
        3477543978,
        3477543970,
        3477544305,
        3477544189,
        3477544128,
        3477542840,
        3477544173,
        3477544178,
        7148354641
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518580,
      "nodes": [
        3477542845,
        11236453115,
        3477544166,
        3477543943,
        3477543945,
        3477544107,
        3477544109,
        3477544110,
        3477544113,
        6708696532
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518587,
      "nodes": [
        3477543200,
        3477543627,
        3477544147,
        3477542861,
        11180759544,
        11180689023,
        3709736096,
        11180689033,
        11898527057,
        11898527072,
        11595797276,
        3709736085,
        11595797282,
        11898527119,
        3477542844
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518591,
      "nodes": [
        3477543233,
        12219581397,
        3708142647,
        5931062449,
        3708142657,
        12219581388,
        3477543916
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518592,
      "nodes": [
        3477543281,
        3477543968,
        3477543927,
        3477543926,
        10160134463,
        3477543924,
        12771447481,
        3485984643
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518598,
      "nodes": [
        7148354644,
        3477542889,
        3477543217,
        3477543630,
        3708142604,
        3477542887,
        3477543196,
        3477544156,
        3477544294,
        3477542832,
        3477544311
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518600,
      "nodes": [
        3477543684,
        6018286056,
        5249066566,
        5931062450,
        3477543269
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518607,
      "nodes": [
        3477543684,
        3477543691,
        3477543638,
        3477543906,
        3477543916
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518609,
      "nodes": [
        3477544099,
        7133171702,
        7133171707,
        11180689021,
        3708142536,
        11180689017,
        3477544310,
        3477544141,
        3477543964,
        3477543214
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518616,
      "nodes": [
        3485984635,
        3477543921,
        3477543276,
        3477543957,
        3477543922,
        6708696537,
        3477542857,
        3477543272,
        3477543674,
        3477544095,
        3485984894,
        3477544098,
        3477544163,
        3477543284,
        3485984630,
        3477543965,
        3477544105,
        3477543233
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518620,
      "nodes": [
        3477543938,
        3477543939,
        3477543941,
        5249062592,
        3477543942,
        3477543261
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518622,
      "nodes": [
        3477544176,
        3477543268,
        3477543275,
        3477544094,
        3477543229,
        3477543639,
        3477544192,
        3477542838,
        3477544306,
        3477543668,
        3477543234,
        3477543893,
        3477543237,
        3477543979,
        3477543211,
        3477543946,
        3477544188,
        3477543910,
        3477544135,
        3477544311,
        3477543604,
        3477542854,
        3477544176
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518624,
      "nodes": [
        3477544192,
        6708696573,
        6708696575,
        6708696577,
        6708696578,
        6708696580,
        6708696530,
        6708696518,
        6708696534,
        6708696517,
        6708696525,
        6708709710,
        6708709721,
        3477543272
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518638,
      "nodes": [
        6708696537,
        6708696538,
        6708696529,
        6708696535,
        6708696528,
        6708696548,
        6708696546,
        6708696558,
        6708696551,
        6708696543,
        6708696556,
        6708696554,
        6708696552,
        3477543668
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 340518650,
      "nodes": [
        3477542854,
        11502888088,
        3485984895,
        3485984687,
        11502888095,
        5931062455,
        3708141721,
        11502888069,
        3477543659
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "המיל השלישי",
        "name:en": "HaMil HaShlishi",
        "name:he": "המיל השלישי",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 341400701,
      "nodes": [
        3485984894,
        12219581401,
        12219581400,
        3485984903,
        12219581399,
        3485984674,
        3485984660,
        3485984895
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 341400703,
      "nodes": [
        7148354647,
        6708696574
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "חמרא",
        "name:en": "Hamra",
        "name:he": "חמרא",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832169,
      "nodes": [
        3708141721,
        3708142666,
        3708142561,
        3708142574,
        3708142539,
        3708142639,
        3708142636,
        3708142631,
        3708142628,
        3708142622,
        3708142657
      ],
      "tags": {
        "highway": "residential",
        "name": "שירת יין",
        "name:en": "Shirat Yayin",
        "name:he": "שירת יין",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832176,
      "nodes": [
        3708142610,
        3708142551,
        3708142621,
        3708142620,
        3708142600,
        3708142562
      ],
      "tags": {
        "highway": "residential",
        "name": "בשומת",
        "name:en": "Besomet",
        "name:he": "בשומת",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832178,
      "nodes": [
        3708142540,
        3708142604
      ],
      "tags": {
        "highway": "residential",
        "name": "אצוה",
        "name:en": "'Atsva",
        "name:he": "אצוה",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832179,
      "nodes": [
        3708142535,
        5931062454,
        3708142615
      ],
      "tags": {
        "highway": "residential",
        "name": "אצוה",
        "name:en": "'Atsva",
        "name:he": "אצוה",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832182,
      "nodes": [
        12219581391,
        3708142665,
        3708142566,
        3708142546,
        3708142617,
        3708142596,
        12219581390,
        3708142614,
        3708142606,
        12219581389
      ],
      "tags": {
        "highway": "residential",
        "name": "מבשלה",
        "name:en": "Mivshala",
        "name:he": "מבשלה",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832183,
      "nodes": [
        6708696583,
        3708142539,
        3708142554,
        5931062451,
        3708142546
      ],
      "tags": {
        "highway": "residential",
        "name": "סברי מרנן",
        "name:en": "Savre Maranan",
        "name:he": "סברי מרנן",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994838,
      "nodes": [
        11180689022,
        11180744899,
        3709736106,
        11900322562,
        3709736128,
        11900286736,
        3709736123,
        3709736049
      ],
      "tags": {
        "highway": "residential",
        "name": "דוריף",
        "name:en": "Durif",
        "name:he": "דוריף",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994841,
      "nodes": [
        6708709717,
        11900322523,
        3709736128,
        3709736130,
        6708630443
      ],
      "tags": {
        "highway": "residential",
        "name": "סברי מרנן",
        "name:en": "Savre Maranan",
        "name:he": "סברי מרנן",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994845,
      "nodes": [
        3709736092,
        11898527124,
        3709736090,
        11898527094,
        11898527058,
        3709736106,
        3709736043,
        11180759546,
        3709736093
      ],
      "tags": {
        "highway": "residential",
        "name": "הכורמים",
        "name:en": "HaKormim",
        "name:he": "הכורמים",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994846,
      "nodes": [
        11595797271,
        3709736090,
        11900322561,
        3709736130,
        13032152785,
        3709736050,
        3709736054,
        3709736118
      ],
      "tags": {
        "highway": "residential",
        "name": "שאנין",
        "name:en": "Chenin",
        "name:he": "שאנין",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994847,
      "nodes": [
        3709736135,
        11900286751,
        3709736050,
        3709736123,
        11900322553,
        3709736119
      ],
      "tags": {
        "highway": "residential",
        "name": "הגתות",
        "name:en": "HaGatot",
        "name:he": "הגתות",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994848,
      "nodes": [
        3709736094,
        11900322814,
        3709736064,
        3709736101,
        3709736021
      ],
      "tags": {
        "highway": "residential",
        "name": "שפיה",
        "name:en": "Shfiya",
        "name:he": "שפיה",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 542955236,
      "nodes": [
        3708142547,
        11900286718,
        3708141723,
        3708142635,
        11900286716,
        3708142577,
        3708142528,
        3708142578,
        3708142580,
        3708142581,
        3708142582,
        3708142583,
        3708142584,
        3708142586,
        3708142585,
        3708142587,
        3708142588,
        3708142589,
        3708142591,
        3708142593,
        3708142543
      ],
      "tags": {
        "highway": "residential",
        "name": "נחלה",
        "name:en": "Nahala",
        "name:he": "נחלה",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 613396122,
      "nodes": [
        11502888078,
        3477543271,
        3477544315,
        11502888087,
        3708142666,
        3708141698,
        3708142652,
        12219581395,
        11502888096,
        3485984684,
        3485984660,
        11502888103,
        3477544094
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "המיל השלישי",
        "name:en": "HaMil HaShlishi",
        "name:he": "המיל השלישי",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 638585001,
      "nodes": [
        6018286055,
        11898504782,
        11898504780,
        11898504779,
        6018286057,
        6018286056
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 677374318,
      "nodes": [
        3709736076,
        3709736101,
        3709736116,
        11900323020,
        3709736063
      ],
      "tags": {
        "highway": "residential",
        "name": "דוריף",
        "name:en": "Durif",
        "name:he": "דוריף",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 690191294,
      "nodes": [
        3709736118,
        3709736064,
        3709736132,
        3709736060
      ],
      "tags": {
        "highway": "residential",
        "name": "שאנין",
        "name:en": "Chenin",
        "name:he": "שאנין",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512674,
      "nodes": [
        6708709714,
        7148354652,
        7148354654,
        7148354650
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "חמרא",
        "name:en": "Hamra",
        "name:he": "חמרא",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512675,
      "nodes": [
        11502888082,
        3709736119,
        6708696526
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512676,
      "nodes": [
        6708709688,
        3477544165,
        3709736093,
        3477543990,
        3477543986,
        3477543984,
        3477543982,
        3477543973,
        3477543647
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512678,
      "nodes": [
        6708696557,
        5207288892,
        11502888083,
        3477544315,
        3477543659
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512680,
      "nodes": [
        6708709690,
        6708709729,
        6708696533,
        6708709726,
        6708709694,
        6708709708,
        6708709695,
        6708709700,
        6708709691,
        6708696579,
        6708709706,
        6708709693,
        6708709709,
        6708709718,
        6708709699,
        6708709714,
        6708709698,
        6708709697,
        6708709702,
        6708696574,
        6708709707,
        6708696524,
        6708709692,
        6708709687,
        6708709690
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512682,
      "nodes": [
        3485984687,
        3485984684,
        11502888100,
        3485984897,
        3708142659,
        3708142567,
        3485984630
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512683,
      "nodes": [
        6708696524,
        3708142610,
        3485984901,
        6708696531
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512685,
      "nodes": [
        6708696563,
        3708141697,
        5931062453,
        6708709700
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "חמרא",
        "name:en": "Hamra",
        "name:he": "חמרא",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512687,
      "nodes": [
        6708696532,
        6708696584,
        6708696527,
        6708696519,
        6708696583,
        6708696523,
        6708696521,
        7591402464,
        6708696557
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 763373737,
      "nodes": [
        6708696579,
        3485984917,
        3708142615,
        3485984916,
        3485984668,
        3485984690,
        11502888092,
        3485984687
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 763373740,
      "nodes": [
        6708709725,
        3709736117,
        3709736021,
        11502888073,
        3477543949
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 763373743,
      "nodes": [
        3477543659,
        11502888072,
        11898526803,
        11898526802,
        6708696571
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "maxspeed": "50",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 763373745,
      "nodes": [
        3485984895,
        11502888090,
        3485984631,
        3485984906,
        3485984675,
        3708142540,
        3485984667,
        6708709718
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 765361513,
      "nodes": [
        7148354658,
        7148354663,
        7148354662,
        7148354647,
        7148354661,
        7148354660,
        7148354650,
        7148354659,
        7148354644,
        7148354657,
        7148354656,
        7148354653,
        7148354641,
        7148354651,
        7148354648,
        7148354649,
        7148354646,
        7148354645,
        7148354640,
        7148354642,
        7148354655,
        7148354643,
        7148354658
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 765361514,
      "nodes": [
        7148354640,
        3477543985,
        3477543958,
        3477544316,
        3477544307,
        3477544303,
        3477542853,
        3477544118,
        3477543595
      ],
      "tags": {
        "highway": "tertiary",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 765361515,
      "nodes": [
        3477544143,
        3477543287,
        3477543610,
        3708142565,
        3477543616,
        3477543944,
        3477544183,
        3708142562,
        3477542883,
        3477543222,
        7148354643
      ],
      "tags": {
        "highway": "tertiary",
        "name": "היוצרים",
        "name:en": "HaYotsrim",
        "name:he": "היוצרים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 801577228,
      "nodes": [
        2058408446,
        13526949041
      ],
      "tags": {
        "highway": "tertiary",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 801577229,
      "nodes": [
        3485984928,
        13526949033,
        9743806904,
        3485984659,
        10196677513
      ],
      "tags": {
        "highway": "tertiary",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 801577230,
      "nodes": [
        3708141697,
        3708142535,
        3708141721
      ],
      "tags": {
        "highway": "residential",
        "name": "שירת יין",
        "name:en": "Shirat Yayin",
        "name:he": "שירת יין",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 895569829,
      "nodes": [
        390445392,
        10160134453,
        12771447483,
        390445260,
        10160134452,
        390445283,
        1474515609,
        390445284,
        390445285,
        390445286,
        10196677514,
        10196677513
      ],
      "tags": {
        "highway": "secondary",
        "lanes": "3",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 956353222,
      "nodes": [
        587091529,
        390430484
      ],
      "tags": {
        "highway": "secondary",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 956353232,
      "nodes": [
        1808065044,
        587091882
      ],
      "tags": {
        "highway": "secondary",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 963656631,
      "nodes": [
        1808065040,
        1808065036,
        1808065058,
        1808065072,
        1808065103,
        1808065105,
        1808065116,
        2129713485,
        2129713467,
        1808065119,
        1808065150,
        1808065090,
        1808065104,
        1808065056,
        1808065082,
        1808065336,
        1808065258,
        1808065076,
        1808065098,
        1808065068,
        1808065074,
        1808065118
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1060559700,
      "nodes": [
        10196677513,
        2058408446
      ],
      "tags": {
        "highway": "tertiary",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1120571854,
      "nodes": [
        3477543214,
        3477543637,
        3477544190,
        3477543636,
        3477543281
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1120571855,
      "nodes": [
        3477543200,
        3477543679,
        3477544185,
        3477543214
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1120571856,
      "nodes": [
        3477543281,
        3477543952,
        3477543245,
        3477543897,
        3477543261
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1120571861,
      "nodes": [
        13526949037,
        2058408445,
        2058408446,
        3485984659,
        13526949036,
        390440019,
        390440020,
        390440021,
        1560915497,
        2247744399
      ],
      "tags": {
        "highway": "secondary",
        "lanes": "3",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801969,
      "nodes": [
        6708696526,
        6708696568,
        6708696516,
        6708696514,
        6708709717,
        6708696515,
        6708696582,
        6708709688
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801970,
      "nodes": [
        6708709688,
        6708709689,
        6708696581,
        6708709685,
        6708696532
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801971,
      "nodes": [
        3477543647,
        3477543917,
        3477543200
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801972,
      "nodes": [
        3477542845,
        3477543289,
        3477544148,
        3477543260,
        3477544308,
        3477543647
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801973,
      "nodes": [
        6708696557,
        6708709719,
        6708696553,
        6708709712,
        6708696526
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286929,
      "nodes": [
        11502888069,
        11502888070,
        11502888071,
        11502888072
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "maxspeed": "50",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286930,
      "nodes": [
        11502888073,
        11502888074,
        11502888075,
        11502888076,
        11502888077
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "maxspeed": "50",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286931,
      "nodes": [
        11502888078,
        11502888079,
        11502888080,
        11502888081,
        11502888082
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "maxspeed": "50",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286932,
      "nodes": [
        11502888083,
        11502888084,
        11502888085,
        11502888086,
        11502888087
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "maxspeed": "50",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286933,
      "nodes": [
        11502888088,
        11502888089,
        11502888090
      ],
      "tags": {
        "highway": "tertiary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286934,
      "nodes": [
        11502888092,
        11502888093,
        11502888094,
        11502888095
      ],
      "tags": {
        "highway": "tertiary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286935,
      "nodes": [
        11502888096,
        11502888097,
        11502888098,
        11502888099,
        11502888100
      ],
      "tags": {
        "highway": "tertiary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1238286936,
      "nodes": [
        3485984674,
        11502888104,
        11502888102,
        11502888103
      ],
      "tags": {
        "highway": "tertiary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1249530329,
      "nodes": [
        11180761333,
        3709736054,
        3709736049,
        11502888078
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "המיל השלישי",
        "name:en": "HaMil HaShlishi",
        "name:he": "המיל השלישי",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1249530330,
      "nodes": [
        3477543949,
        3477543271,
        11502888082
      ],
      "tags": {
        "alt_name:en": "Derekh Erets",
        "highway": "secondary",
        "name": "דרך ארץ",
        "name:en": "Derekh Eretz",
        "name:he": "דרך ארץ",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1249530339,
      "nodes": [
        3477543659,
        3477543949,
        11502888077,
        3709736076,
        3709736118,
        11180770845,
        3477543658,
        3477544314
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "המיל השלישי",
        "name:en": "HaMil HaShlishi",
        "name:he": "המיל השלישי",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1320487396,
      "nodes": [
        3708142652,
        12219581392,
        12219581391,
        12219581393,
        12219581394,
        12219581395
      ],
      "tags": {
        "highway": "residential",
        "name": "מבשלה",
        "name:en": "Mivshala",
        "name:he": "מבשלה",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1320487397,
      "nodes": [
        12219581397,
        12219581396,
        12219581389,
        12219581398,
        3708142647
      ],
      "tags": {
        "highway": "residential",
        "name": "מבשלה",
        "name:en": "Mivshala",
        "name:he": "מבשלה",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1474497089,
      "nodes": [
        13526949033,
        13526949034,
        13526949035,
        13526949043,
        13526949036
      ],
      "tags": {
        "highway": "secondary_link",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1474497090,
      "nodes": [
        13526949037,
        13526949038,
        13526949039,
        13526949040,
        13526949042,
        13526949041
      ],
      "tags": {
        "highway": "secondary_link",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1505872156,
      "nodes": [
        3477543916,
        3477544096,
        3477542845
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1505872157,
      "nodes": [
        13526949041,
        3485984635
      ],
      "tags": {
        "highway": "tertiary",
        "name": "קנקני אשקלון",
        "name:en": "Kankaney Ashkelon",
        "name:he": "קנקני אשקלון",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1505872158,
      "nodes": [
        587091884,
        2058408443,
        13526949037
      ],
      "tags": {
        "highway": "secondary",
        "lanes": "3",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1505872159,
      "nodes": [
        10196677513,
        10196677515,
        2058408444,
        390445287
      ],
      "tags": {
        "highway": "secondary",
        "lanes": "3",
        "name": "מנחם בגין",
        "name:ar": "مناحيم بيغن",
        "name:en": "Menachem Begin",
        "name:he": "מנחם בגין",
        "name:ru": "Менахем Бегин",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1505872160,
      "nodes": [
        3485984928,
        3477544151,
        3477543663,
        3485984635
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1505872161,
      "nodes": [
        3477543269,
        3477543641,
        3477544108,
        3485984928
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1505872162,
      "nodes": [
        3477543233,
        3477544112,
        3477543688,
        3477543212,
        3477543269
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1505872163,
      "nodes": [
        3477543261,
        3477543665,
        3477543904,
        3477543684
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "node",
      "id": 390430484,
      "lat": 31.6795476,
      "lon": 34.6054741
    },
    {
      "type": "node",
      "id": 390440019,
      "lat": 31.6793611,
      "lon": 34.5983457
    },
    {
      "type": "node",
      "id": 390440020,
      "lat": 31.6793063,
      "lon": 34.5977237
    },
    {
      "type": "node",
      "id": 390440021,
      "lat": 31.6792195,
      "lon": 34.5971613
    },
    {
      "type": "node",
      "id": 390445260,
      "lat": 31.6787903,
      "lon": 34.5961594
    },
    {
      "type": "node",
      "id": 390445283,
      "lat": 31.6789414,
      "lon": 34.5966412
    },
    {
      "type": "node",
      "id": 390445284,
      "lat": 31.679071,
      "lon": 34.5971928
    },
    {
      "type": "node",
      "id": 390445285,
      "lat": 31.6791675,
      "lon": 34.5977208
    },
    {
      "type": "node",
      "id": 390445286,
      "lat": 31.6792138,
      "lon": 34.5981707
    },
    {
      "type": "node",
      "id": 390445287,
      "lat": 31.6794716,
      "lon": 34.604056
    },
    {
      "type": "node",
      "id": 390445392,
      "lat": 31.6786843,
      "lon": 34.5958785
    },
    {
      "type": "node",
      "id": 587091529,
      "lat": 31.6795095,
      "lon": 34.6047952
    },
    {
      "type": "node",
      "id": 587091882,
      "lat": 31.6796563,
      "lon": 34.604759
    },
    {
      "type": "node",
      "id": 587091884,
      "lat": 31.6796275,
      "lon": 34.604042
    },
    {
      "type": "node",
      "id": 1474515609,
      "lat": 31.6790159,
      "lon": 34.5969465
    },
    {
      "type": "node",
      "id": 1560915497,
      "lat": 31.6791234,
      "lon": 34.5967773
    },
    {
      "type": "node",
      "id": 1808065036,
      "lat": 31.67789,
      "lon": 34.605079
    },
    {
      "type": "node",
      "id": 1808065040,
      "lat": 31.6777888,
      "lon": 34.605242
    },
    {
      "type": "node",
      "id": 1808065044,
      "lat": 31.6797069,
      "lon": 34.605506
    },
    {
      "type": "node",
      "id": 1808065052,
      "lat": 31.6819177,
      "lon": 34.6057819
    },
    {
      "type": "node",
      "id": 1808065056,
      "lat": 31.6812409,
      "lon": 34.6047644
    },
    {
      "type": "node",
      "id": 1808065058,
      "lat": 31.6780129,
      "lon": 34.6049452
    },
    {
      "type": "node",
      "id": 1808065068,
      "lat": 31.6816333,
      "lon": 34.6055931
    },
    {
      "type": "node",
      "id": 1808065072,
      "lat": 31.6781575,
      "lon": 34.6048356
    },
    {
      "type": "node",
      "id": 1808065074,
      "lat": 31.6816139,
      "lon": 34.6056685
    },
    {
      "type": "node",
      "id": 1808065076,
      "lat": 31.6816335,
      "lon": 34.6054108
    },
    {
      "type": "node",
      "id": 1808065080,
      "lat": 31.6785183,
      "lon": 34.6046287
    },
    {
      "type": "node",
      "id": 1808065082,
      "lat": 31.6813801,
      "lon": 34.6048931
    },
    {
      "type": "node",
      "id": 1808065090,
      "lat": 31.6809328,
      "lon": 34.6046276
    },
    {
      "type": "node",
      "id": 1808065098,
      "lat": 31.6816403,
      "lon": 34.6055071
    },
    {
      "type": "node",
      "id": 1808065103,
      "lat": 31.678297,
      "lon": 34.604773
    },
    {
      "type": "node",
      "id": 1808065104,
      "lat": 31.6811131,
      "lon": 34.6046812
    },
    {
      "type": "node",
      "id": 1808065105,
      "lat": 31.6784087,
      "lon": 34.6047498
    },
    {
      "type": "node",
      "id": 1808065116,
      "lat": 31.6785537,
      "lon": 34.6047343
    },
    {
      "type": "node",
      "id": 1808065118,
      "lat": 31.6815847,
      "lon": 34.6057403
    },
    {
      "type": "node",
      "id": 1808065119,
      "lat": 31.6802854,
      "lon": 34.6046115
    },
    {
      "type": "node",
      "id": 1808065150,
      "lat": 31.6806611,
      "lon": 34.6046115
    },
    {
      "type": "node",
      "id": 1808065152,
      "lat": 31.6789492,
      "lon": 34.6045873
    },
    {
      "type": "node",
      "id": 1808065155,
      "lat": 31.6793464,
      "lon": 34.6045712
    },
    {
      "type": "node",
      "id": 1808065158,
      "lat": 31.6816472,
      "lon": 34.605046
    },
    {
      "type": "node",
      "id": 1808065178,
      "lat": 31.6805767,
      "lon": 34.6045095
    },
    {
      "type": "node",
      "id": 1808065186,
      "lat": 31.681056,
      "lon": 34.6045256
    },
    {
      "type": "node",
      "id": 1808065187,
      "lat": 31.6815422,
      "lon": 34.6048877
    },
    {
      "type": "node",
      "id": 1808065190,
      "lat": 31.6808757,
      "lon": 34.6045015
    },
    {
      "type": "node",
      "id": 1808065192,
      "lat": 31.6812158,
      "lon": 34.6045873
    },
    {
      "type": "node",
      "id": 1808065232,
      "lat": 31.681403,
      "lon": 34.6047295
    },
    {
      "type": "node",
      "id": 1808065242,
      "lat": 31.6818549,
      "lon": 34.6056949
    },
    {
      "type": "node",
      "id": 1808065255,
      "lat": 31.6818115,
      "lon": 34.605628
    },
    {
      "type": "node",
      "id": 1808065258,
      "lat": 31.6815901,
      "lon": 34.6052337
    },
    {
      "type": "node",
      "id": 1808065290,
      "lat": 31.6817659,
      "lon": 34.6054993
    },
    {
      "type": "node",
      "id": 1808065293,
      "lat": 31.6817065,
      "lon": 34.6052042
    },
    {
      "type": "node",
      "id": 1808065324,
      "lat": 31.6779305,
      "lon": 34.6048974
    },
    {
      "type": "node",
      "id": 1808065329,
      "lat": 31.6781164,
      "lon": 34.6047329
    },
    {
      "type": "node",
      "id": 1808065333,
      "lat": 31.6783368,
      "lon": 34.6046536
    },
    {
      "type": "node",
      "id": 1808065336,
      "lat": 31.6815194,
      "lon": 34.6050782
    },
    {
      "type": "node",
      "id": 2058408443,
      "lat": 31.6795759,
      "lon": 34.6029029
    },
    {
      "type": "node",
      "id": 2058408444,
      "lat": 31.6794091,
      "lon": 34.6028959
    },
    {
      "type": "node",
      "id": 2058408445,
      "lat": 31.6794981,
      "lon": 34.6010262
    },
    {
      "type": "node",
      "id": 2058408446,
      "lat": 31.6794838,
      "lon": 34.6007024
    },
    {
      "type": "node",
      "id": 2129713467,
      "lat": 31.6792143,
      "lon": 34.6046667
    },
    {
      "type": "node",
      "id": 2129713485,
      "lat": 31.6788127,
      "lon": 34.6046961
    },
    {
      "type": "node",
      "id": 2247744399,
      "lat": 31.6790026,
      "lon": 34.5963627
    },
    {
      "type": "node",
      "id": 3477542832,
      "lat": 31.683684,
      "lon": 34.602682
    },
    {
      "type": "node",
      "id": 3477542838,
      "lat": 31.6831172,
      "lon": 34.6026624
    },
    {
      "type": "node",
      "id": 3477542840,
      "lat": 31.685593,
      "lon": 34.603336
    },
    {
      "type": "node",
      "id": 3477542844,
      "lat": 31.681955,
      "lon": 34.590896
    },
    {
      "type": "node",
      "id": 3477542845,
      "lat": 31.6808479,
      "lon": 34.5951769
    },
    {
      "type": "node",
      "id": 3477542853,
      "lat": 31.6878109,
      "lon": 34.6047277
    },
    {
      "type": "node",
      "id": 3477542854,
      "lat": 31.6833791,
      "lon": 34.6025757
    },
    {
      "type": "node",
      "id": 3477542857,
      "lat": 31.6809822,
      "lon": 34.6007861
    },
    {
      "type": "node",
      "id": 3477542861,
      "lat": 31.6808535,
      "lon": 34.5944749
    },
    {
      "type": "node",
      "id": 3477542883,
      "lat": 31.6868161,
      "lon": 34.6038567
    },
    {
      "type": "node",
      "id": 3477542887,
      "lat": 31.6848753,
      "lon": 34.6029433
    },
    {
      "type": "node",
      "id": 3477542889,
      "lat": 31.6860499,
      "lon": 34.6034197
    },
    {
      "type": "node",
      "id": 3477543196,
      "lat": 31.6846396,
      "lon": 34.602869
    },
    {
      "type": "node",
      "id": 3477543200,
      "lat": 31.6807859,
      "lon": 34.5949313
    },
    {
      "type": "node",
      "id": 3477543211,
      "lat": 31.6833353,
      "lon": 34.6028269
    },
    {
      "type": "node",
      "id": 3477543212,
      "lat": 31.6809461,
      "lon": 34.6004465
    },
    {
      "type": "node",
      "id": 3477543214,
      "lat": 31.6806878,
      "lon": 34.5949191
    },
    {
      "type": "node",
      "id": 3477543217,
      "lat": 31.6856257,
      "lon": 34.6032225
    },
    {
      "type": "node",
      "id": 3477543222,
      "lat": 31.6865466,
      "lon": 34.6036854
    },
    {
      "type": "node",
      "id": 3477543229,
      "lat": 31.6831616,
      "lon": 34.6025546
    },
    {
      "type": "node",
      "id": 3477543233,
      "lat": 31.6810233,
      "lon": 34.6004593
    },
    {
      "type": "node",
      "id": 3477543234,
      "lat": 31.6831449,
      "lon": 34.60278
    },
    {
      "type": "node",
      "id": 3477543237,
      "lat": 31.6832252,
      "lon": 34.6028442
    },
    {
      "type": "node",
      "id": 3477543245,
      "lat": 31.6805756,
      "lon": 34.5950981
    },
    {
      "type": "node",
      "id": 3477543260,
      "lat": 31.6808682,
      "lon": 34.595066
    },
    {
      "type": "node",
      "id": 3477543261,
      "lat": 31.680597,
      "lon": 34.5951775
    },
    {
      "type": "node",
      "id": 3477543268,
      "lat": 31.6832756,
      "lon": 34.6025078
    },
    {
      "type": "node",
      "id": 3477543269,
      "lat": 31.6809204,
      "lon": 34.6004533
    },
    {
      "type": "node",
      "id": 3477543271,
      "lat": 31.6851033,
      "lon": 34.5964943
    },
    {
      "type": "node",
      "id": 3477543272,
      "lat": 31.6810304,
      "lon": 34.6007691
    },
    {
      "type": "node",
      "id": 3477543275,
      "lat": 31.6832251,
      "lon": 34.6025128
    },
    {
      "type": "node",
      "id": 3477543276,
      "lat": 31.6808634,
      "lon": 34.6007386
    },
    {
      "type": "node",
      "id": 3477543281,
      "lat": 31.6805875,
      "lon": 34.5950181
    },
    {
      "type": "node",
      "id": 3477543284,
      "lat": 31.6811071,
      "lon": 34.6005785
    },
    {
      "type": "node",
      "id": 3477543287,
      "lat": 31.6883498,
      "lon": 34.6050855
    },
    {
      "type": "node",
      "id": 3477543289,
      "lat": 31.6808615,
      "lon": 34.5951426
    },
    {
      "type": "node",
      "id": 3477543595,
      "lat": 31.6884819,
      "lon": 34.6053557
    },
    {
      "type": "node",
      "id": 3477543604,
      "lat": 31.683402,
      "lon": 34.6026288
    },
    {
      "type": "node",
      "id": 3477543610,
      "lat": 31.6878723,
      "lon": 34.6046319
    },
    {
      "type": "node",
      "id": 3477543616,
      "lat": 31.6876413,
      "lon": 34.604442
    },
    {
      "type": "node",
      "id": 3477543627,
      "lat": 31.6808,
      "lon": 34.5947247
    },
    {
      "type": "node",
      "id": 3477543630,
      "lat": 31.6851163,
      "lon": 34.6030208
    },
    {
      "type": "node",
      "id": 3477543636,
      "lat": 31.6806045,
      "lon": 34.5949837
    },
    {
      "type": "node",
      "id": 3477543637,
      "lat": 31.680656,
      "lon": 34.5949328
    },
    {
      "type": "node",
      "id": 3477543638,
      "lat": 31.6807315,
      "lon": 34.5952594
    },
    {
      "type": "node",
      "id": 3477543639,
      "lat": 31.6831317,
      "lon": 34.6026026
    },
    {
      "type": "node",
      "id": 3477543641,
      "lat": 31.6808786,
      "lon": 34.6004784
    },
    {
      "type": "node",
      "id": 3477543647,
      "lat": 31.6808432,
      "lon": 34.5949887
    },
    {
      "type": "node",
      "id": 3477543658,
      "lat": 31.6864812,
      "lon": 34.5927499
    },
    {
      "type": "node",
      "id": 3477543659,
      "lat": 31.6852487,
      "lon": 34.5966988
    },
    {
      "type": "node",
      "id": 3477543663,
      "lat": 31.6808222,
      "lon": 34.6006491
    },
    {
      "type": "node",
      "id": 3477543665,
      "lat": 31.6806135,
      "lon": 34.5952032
    },
    {
      "type": "node",
      "id": 3477543668,
      "lat": 31.6831313,
      "lon": 34.6027463
    },
    {
      "type": "node",
      "id": 3477543674,
      "lat": 31.6810598,
      "lon": 34.6007462
    },
    {
      "type": "node",
      "id": 3477543679,
      "lat": 31.6807543,
      "lon": 34.5949184
    },
    {
      "type": "node",
      "id": 3477543684,
      "lat": 31.680657,
      "lon": 34.5952418
    },
    {
      "type": "node",
      "id": 3477543688,
      "lat": 31.6809723,
      "lon": 34.6004452
    },
    {
      "type": "node",
      "id": 3477543691,
      "lat": 31.6806933,
      "lon": 34.5952564
    },
    {
      "type": "node",
      "id": 3477543893,
      "lat": 31.6831816,
      "lon": 34.6028211
    },
    {
      "type": "node",
      "id": 3477543897,
      "lat": 31.6805822,
      "lon": 34.5951393
    },
    {
      "type": "node",
      "id": 3477543904,
      "lat": 31.6806337,
      "lon": 34.5952249
    },
    {
      "type": "node",
      "id": 3477543906,
      "lat": 31.6807691,
      "lon": 34.5952508
    },
    {
      "type": "node",
      "id": 3477543910,
      "lat": 31.6834038,
      "lon": 34.6027205
    },
    {
      "type": "node",
      "id": 3477543916,
      "lat": 31.6808035,
      "lon": 34.595231
    },
    {
      "type": "node",
      "id": 3477543917,
      "lat": 31.6808177,
      "lon": 34.5949556
    },
    {
      "type": "node",
      "id": 3477543921,
      "lat": 31.6808462,
      "lon": 34.600715
    },
    {
      "type": "node",
      "id": 3477543922,
      "lat": 31.680907,
      "lon": 34.6007731
    },
    {
      "type": "node",
      "id": 3477543924,
      "lat": 31.6790727,
      "lon": 34.5956159
    },
    {
      "type": "node",
      "id": 3477543926,
      "lat": 31.6796278,
      "lon": 34.5953143
    },
    {
      "type": "node",
      "id": 3477543927,
      "lat": 31.6799342,
      "lon": 34.5951915
    },
    {
      "type": "node",
      "id": 3477543938,
      "lat": 31.6791107,
      "lon": 34.5957792
    },
    {
      "type": "node",
      "id": 3477543939,
      "lat": 31.6796726,
      "lon": 34.5954511
    },
    {
      "type": "node",
      "id": 3477543941,
      "lat": 31.6798761,
      "lon": 34.5953715
    },
    {
      "type": "node",
      "id": 3477543942,
      "lat": 31.6802959,
      "lon": 34.5952386
    },
    {
      "type": "node",
      "id": 3477543943,
      "lat": 31.6813566,
      "lon": 34.5951766
    },
    {
      "type": "node",
      "id": 3477543944,
      "lat": 31.6874196,
      "lon": 34.6042758
    },
    {
      "type": "node",
      "id": 3477543945,
      "lat": 31.6816074,
      "lon": 34.5952091
    },
    {
      "type": "node",
      "id": 3477543946,
      "lat": 31.6833741,
      "lon": 34.6027886
    },
    {
      "type": "node",
      "id": 3477543949,
      "lat": 31.685285,
      "lon": 34.5965825
    },
    {
      "type": "node",
      "id": 3477543952,
      "lat": 31.6805776,
      "lon": 34.5950562
    },
    {
      "type": "node",
      "id": 3477543955,
      "lat": 31.6836717,
      "lon": 34.602801
    },
    {
      "type": "node",
      "id": 3477543957,
      "lat": 31.6808838,
      "lon": 34.6007582
    },
    {
      "type": "node",
      "id": 3477543958,
      "lat": 31.6867662,
      "lon": 34.6039612
    },
    {
      "type": "node",
      "id": 3477543964,
      "lat": 31.6807084,
      "lon": 34.5947238
    },
    {
      "type": "node",
      "id": 3477543965,
      "lat": 31.6810794,
      "lon": 34.6005102
    },
    {
      "type": "node",
      "id": 3477543968,
      "lat": 31.6802383,
      "lon": 34.5951115
    },
    {
      "type": "node",
      "id": 3477543970,
      "lat": 31.6843304,
      "lon": 34.6029193
    },
    {
      "type": "node",
      "id": 3477543973,
      "lat": 31.6811189,
      "lon": 34.5950202
    },
    {
      "type": "node",
      "id": 3477543978,
      "lat": 31.6840689,
      "lon": 34.6028597
    },
    {
      "type": "node",
      "id": 3477543979,
      "lat": 31.6832757,
      "lon": 34.6028491
    },
    {
      "type": "node",
      "id": 3477543982,
      "lat": 31.6813686,
      "lon": 34.5950369
    },
    {
      "type": "node",
      "id": 3477543984,
      "lat": 31.6816133,
      "lon": 34.5950808
    },
    {
      "type": "node",
      "id": 3477543985,
      "lat": 31.6864987,
      "lon": 34.6037912
    },
    {
      "type": "node",
      "id": 3477543986,
      "lat": 31.6818582,
      "lon": 34.595145
    },
    {
      "type": "node",
      "id": 3477543990,
      "lat": 31.6820589,
      "lon": 34.5952085
    },
    {
      "type": "node",
      "id": 3477544094,
      "lat": 31.6831884,
      "lon": 34.602537
    },
    {
      "type": "node",
      "id": 3477544095,
      "lat": 31.6810836,
      "lon": 34.6007157
    },
    {
      "type": "node",
      "id": 3477544096,
      "lat": 31.6808282,
      "lon": 34.5952068
    },
    {
      "type": "node",
      "id": 3477544098,
      "lat": 31.6811084,
      "lon": 34.6006465
    },
    {
      "type": "node",
      "id": 3477544099,
      "lat": 31.6818518,
      "lon": 34.5908461
    },
    {
      "type": "node",
      "id": 3477544105,
      "lat": 31.6810541,
      "lon": 34.6004807
    },
    {
      "type": "node",
      "id": 3477544107,
      "lat": 31.68184,
      "lon": 34.5952785
    },
    {
      "type": "node",
      "id": 3477544108,
      "lat": 31.6808459,
      "lon": 34.6005179
    },
    {
      "type": "node",
      "id": 3477544109,
      "lat": 31.6820246,
      "lon": 34.5953319
    },
    {
      "type": "node",
      "id": 3477544110,
      "lat": 31.6821837,
      "lon": 34.5953901
    },
    {
      "type": "node",
      "id": 3477544112,
      "lat": 31.6809984,
      "lon": 34.6004496
    },
    {
      "type": "node",
      "id": 3477544113,
      "lat": 31.6823658,
      "lon": 34.5954534
    },
    {
      "type": "node",
      "id": 3477544118,
      "lat": 31.6882842,
      "lon": 34.6051772
    },
    {
      "type": "node",
      "id": 3477544128,
      "lat": 31.6850865,
      "lon": 34.6031355
    },
    {
      "type": "node",
      "id": 3477544135,
      "lat": 31.6834075,
      "lon": 34.6026611
    },
    {
      "type": "node",
      "id": 3477544141,
      "lat": 31.6807317,
      "lon": 34.5945642
    },
    {
      "type": "node",
      "id": 3477544143,
      "lat": 31.6885333,
      "lon": 34.6052804
    },
    {
      "type": "node",
      "id": 3477544147,
      "lat": 31.6808198,
      "lon": 34.5946028
    },
    {
      "type": "node",
      "id": 3477544148,
      "lat": 31.6808685,
      "lon": 34.5951048
    },
    {
      "type": "node",
      "id": 3477544151,
      "lat": 31.6808196,
      "lon": 34.6006081
    },
    {
      "type": "node",
      "id": 3477544156,
      "lat": 31.68435,
      "lon": 34.6028017
    },
    {
      "type": "node",
      "id": 3477544163,
      "lat": 31.6811107,
      "lon": 34.6006124
    },
    {
      "type": "node",
      "id": 3477544165,
      "lat": 31.6824054,
      "lon": 34.5953294
    },
    {
      "type": "node",
      "id": 3477544166,
      "lat": 31.6811078,
      "lon": 34.5951645
    },
    {
      "type": "node",
      "id": 3477544173,
      "lat": 31.6860158,
      "lon": 34.6035399
    },
    {
      "type": "node",
      "id": 3477544176,
      "lat": 31.6833421,
      "lon": 34.602535
    },
    {
      "type": "node",
      "id": 3477544178,
      "lat": 31.6862148,
      "lon": 34.6036166
    },
    {
      "type": "node",
      "id": 3477544183,
      "lat": 31.6871614,
      "lon": 34.6040929
    },
    {
      "type": "node",
      "id": 3477544185,
      "lat": 31.680721,
      "lon": 34.5949142
    },
    {
      "type": "node",
      "id": 3477544188,
      "lat": 31.6833869,
      "lon": 34.6027592
    },
    {
      "type": "node",
      "id": 3477544189,
      "lat": 31.6848486,
      "lon": 34.603059
    },
    {
      "type": "node",
      "id": 3477544190,
      "lat": 31.6806277,
      "lon": 34.5949547
    },
    {
      "type": "node",
      "id": 3477544192,
      "lat": 31.6831278,
      "lon": 34.6026186
    },
    {
      "type": "node",
      "id": 3477544294,
      "lat": 31.684085,
      "lon": 34.6027413
    },
    {
      "type": "node",
      "id": 3477544303,
      "lat": 31.6875846,
      "lon": 34.6045416
    },
    {
      "type": "node",
      "id": 3477544305,
      "lat": 31.6846164,
      "lon": 34.6029858
    },
    {
      "type": "node",
      "id": 3477544306,
      "lat": 31.6831213,
      "lon": 34.6027217
    },
    {
      "type": "node",
      "id": 3477544307,
      "lat": 31.6873659,
      "lon": 34.6043777
    },
    {
      "type": "node",
      "id": 3477544308,
      "lat": 31.6808606,
      "lon": 34.5950283
    },
    {
      "type": "node",
      "id": 3477544310,
      "lat": 31.6807623,
      "lon": 34.5944325
    },
    {
      "type": "node",
      "id": 3477544311,
      "lat": 31.6834041,
      "lon": 34.6026416
    },
    {
      "type": "node",
      "id": 3477544314,
      "lat": 31.6865195,
      "lon": 34.5926271
    },
    {
      "type": "node",
      "id": 3477544315,
      "lat": 31.6850642,
      "lon": 34.5966191
    },
    {
      "type": "node",
      "id": 3477544316,
      "lat": 31.6871094,
      "lon": 34.604196
    },
    {
      "type": "node",
      "id": 3485984630,
      "lat": 31.6810979,
      "lon": 34.600546
    },
    {
      "type": "node",
      "id": 3485984631,
      "lat": 31.6845117,
      "lon": 34.600762
    },
    {
      "type": "node",
      "id": 3485984635,
      "lat": 31.680833,
      "lon": 34.6006882
    },
    {
      "type": "node",
      "id": 3485984643,
      "lat": 31.6788077,
      "lon": 34.59579
    },
    {
      "type": "node",
      "id": 3485984659,
      "lat": 31.679477,
      "lon": 34.6005603
    },
    {
      "type": "node",
      "id": 3485984660,
      "lat": 31.6837785,
      "lon": 34.6006562
    },
    {
      "type": "node",
      "id": 3485984667,
      "lat": 31.6857984,
      "lon": 34.6010866
    },
    {
      "type": "node",
      "id": 3485984668,
      "lat": 31.6850221,
      "lon": 34.6007071
    },
    {
      "type": "node",
      "id": 3485984674,
      "lat": 31.683628,
      "lon": 34.6006487
    },
    {
      "type": "node",
      "id": 3485984675,
      "lat": 31.6854092,
      "lon": 34.6009522
    },
    {
      "type": "node",
      "id": 3485984684,
      "lat": 31.683831,
      "lon": 34.6005356
    },
    {
      "type": "node",
      "id": 3485984687,
      "lat": 31.6840438,
      "lon": 34.6005649
    },
    {
      "type": "node",
      "id": 3485984690,
      "lat": 31.6845561,
      "lon": 34.6006468
    },
    {
      "type": "node",
      "id": 3485984894,
      "lat": 31.6811004,
      "lon": 34.6006794
    },
    {
      "type": "node",
      "id": 3485984895,
      "lat": 31.6840116,
      "lon": 34.6006948
    },
    {
      "type": "node",
      "id": 3485984897,
      "lat": 31.6835337,
      "lon": 34.6005068
    },
    {
      "type": "node",
      "id": 3485984901,
      "lat": 31.6876931,
      "lon": 34.6019137
    },
    {
      "type": "node",
      "id": 3485984903,
      "lat": 31.6828012,
      "lon": 34.6006367
    },
    {
      "type": "node",
      "id": 3485984906,
      "lat": 31.6849981,
      "lon": 34.6008327
    },
    {
      "type": "node",
      "id": 3485984916,
      "lat": 31.6854378,
      "lon": 34.6008279
    },
    {
      "type": "node",
      "id": 3485984917,
      "lat": 31.685833,
      "lon": 34.6009645
    },
    {
      "type": "node",
      "id": 3485984928,
      "lat": 31.6808255,
      "lon": 34.6005676
    },
    {
      "type": "node",
      "id": 3708141697,
      "lat": 31.6876557,
      "lon": 34.5991449
    },
    {
      "type": "node",
      "id": 3708141698,
      "lat": 31.6843793,
      "lon": 34.5987799
    },
    {
      "type": "node",
      "id": 3708141721,
      "lat": 31.684853,
      "lon": 34.5979427
    },
    {
      "type": "node",
      "id": 3708141723,
      "lat": 31.6781057,
      "lon": 34.5927153
    },
    {
      "type": "node",
      "id": 3708142528,
      "lat": 31.6792343,
      "lon": 34.5940236
    },
    {
      "type": "node",
      "id": 3708142535,
      "lat": 31.6862892,
      "lon": 34.5985717
    },
    {
      "type": "node",
      "id": 3708142536,
      "lat": 31.6811023,
      "lon": 34.5933222
    },
    {
      "type": "node",
      "id": 3708142539,
      "lat": 31.6823426,
      "lon": 34.5968659
    },
    {
      "type": "node",
      "id": 3708142540,
      "lat": 31.6855339,
      "lon": 34.600991
    },
    {
      "type": "node",
      "id": 3708142543,
      "lat": 31.6804704,
      "lon": 34.5930537
    },
    {
      "type": "node",
      "id": 3708142546,
      "lat": 31.681765,
      "lon": 34.5986998
    },
    {
      "type": "node",
      "id": 3708142547,
      "lat": 31.6773001,
      "lon": 34.5917365
    },
    {
      "type": "node",
      "id": 3708142551,
      "lat": 31.6872695,
      "lon": 34.6028333
    },
    {
      "type": "node",
      "id": 3708142554,
      "lat": 31.6820558,
      "lon": 34.5977767
    },
    {
      "type": "node",
      "id": 3708142561,
      "lat": 31.6838702,
      "lon": 34.5975211
    },
    {
      "type": "node",
      "id": 3708142562,
      "lat": 31.686854,
      "lon": 34.6038793
    },
    {
      "type": "node",
      "id": 3708142565,
      "lat": 31.6877536,
      "lon": 34.6045343
    },
    {
      "type": "node",
      "id": 3708142566,
      "lat": 31.6825518,
      "lon": 34.599024
    },
    {
      "type": "node",
      "id": 3708142567,
      "lat": 31.6821439,
      "lon": 34.6005161
    },
    {
      "type": "node",
      "id": 3708142574,
      "lat": 31.6831281,
      "lon": 34.5972028
    },
    {
      "type": "node",
      "id": 3708142577,
      "lat": 31.6791247,
      "lon": 34.5939363
    },
    {
      "type": "node",
      "id": 3708142578,
      "lat": 31.6793729,
      "lon": 34.5940998
    },
    {
      "type": "node",
      "id": 3708142580,
      "lat": 31.679487,
      "lon": 34.5941429
    },
    {
      "type": "node",
      "id": 3708142581,
      "lat": 31.6795849,
      "lon": 34.5941624
    },
    {
      "type": "node",
      "id": 3708142582,
      "lat": 31.6796849,
      "lon": 34.5941547
    },
    {
      "type": "node",
      "id": 3708142583,
      "lat": 31.6797844,
      "lon": 34.5941315
    },
    {
      "type": "node",
      "id": 3708142584,
      "lat": 31.6799029,
      "lon": 34.5940854
    },
    {
      "type": "node",
      "id": 3708142585,
      "lat": 31.6801083,
      "lon": 34.5939356
    },
    {
      "type": "node",
      "id": 3708142586,
      "lat": 31.6799996,
      "lon": 34.5940236
    },
    {
      "type": "node",
      "id": 3708142587,
      "lat": 31.6801878,
      "lon": 34.5938413
    },
    {
      "type": "node",
      "id": 3708142588,
      "lat": 31.6802537,
      "lon": 34.5937332
    },
    {
      "type": "node",
      "id": 3708142589,
      "lat": 31.6803031,
      "lon": 34.5936178
    },
    {
      "type": "node",
      "id": 3708142591,
      "lat": 31.6803466,
      "lon": 34.5934908
    },
    {
      "type": "node",
      "id": 3708142593,
      "lat": 31.6803955,
      "lon": 34.5933242
    },
    {
      "type": "node",
      "id": 3708142596,
      "lat": 31.6814741,
      "lon": 34.5985641
    },
    {
      "type": "node",
      "id": 3708142600,
      "lat": 31.6869616,
      "lon": 34.6036376
    },
    {
      "type": "node",
      "id": 3708142604,
      "lat": 31.6849198,
      "lon": 34.6029576
    },
    {
      "type": "node",
      "id": 3708142606,
      "lat": 31.6811921,
      "lon": 34.5985412
    },
    {
      "type": "node",
      "id": 3708142610,
      "lat": 31.6875815,
      "lon": 34.6018625
    },
    {
      "type": "node",
      "id": 3708142614,
      "lat": 31.6813556,
      "lon": 34.5985421
    },
    {
      "type": "node",
      "id": 3708142615,
      "lat": 31.6855703,
      "lon": 34.6008737
    },
    {
      "type": "node",
      "id": 3708142617,
      "lat": 31.6815612,
      "lon": 34.5986039
    },
    {
      "type": "node",
      "id": 3708142620,
      "lat": 31.6870643,
      "lon": 34.6034005
    },
    {
      "type": "node",
      "id": 3708142621,
      "lat": 31.6871787,
      "lon": 34.6031075
    },
    {
      "type": "node",
      "id": 3708142622,
      "lat": 31.6811234,
      "lon": 34.5965589
    },
    {
      "type": "node",
      "id": 3708142628,
      "lat": 31.6813474,
      "lon": 34.596565
    },
    {
      "type": "node",
      "id": 3708142631,
      "lat": 31.6815574,
      "lon": 34.5965976
    },
    {
      "type": "node",
      "id": 3708142635,
      "lat": 31.6783887,
      "lon": 34.5930544
    },
    {
      "type": "node",
      "id": 3708142636,
      "lat": 31.6817577,
      "lon": 34.5966438
    },
    {
      "type": "node",
      "id": 3708142639,
      "lat": 31.6819859,
      "lon": 34.5967134
    },
    {
      "type": "node",
      "id": 3708142647,
      "lat": 31.6809733,
      "lon": 34.5984285
    },
    {
      "type": "node",
      "id": 3708142652,
      "lat": 31.684118,
      "lon": 34.5995785
    },
    {
      "type": "node",
      "id": 3708142657,
      "lat": 31.6808941,
      "lon": 34.5965658
    },
    {
      "type": "node",
      "id": 3708142659,
      "lat": 31.6829527,
      "lon": 34.6004973
    },
    {
      "type": "node",
      "id": 3708142665,
      "lat": 31.6832965,
      "lon": 34.5993456
    },
    {
      "type": "node",
      "id": 3708142666,
      "lat": 31.6846698,
      "lon": 34.5978641
    },
    {
      "type": "node",
      "id": 3709736021,
      "lat": 31.6860429,
      "lon": 34.5969011
    },
    {
      "type": "node",
      "id": 3709736043,
      "lat": 31.6824705,
      "lon": 34.5943099
    },
    {
      "type": "node",
      "id": 3709736049,
      "lat": 31.6855073,
      "lon": 34.5952033
    },
    {
      "type": "node",
      "id": 3709736050,
      "lat": 31.6850998,
      "lon": 34.5936192
    },
    {
      "type": "node",
      "id": 3709736054,
      "lat": 31.6858983,
      "lon": 34.5939545
    },
    {
      "type": "node",
      "id": 3709736060,
      "lat": 31.6888806,
      "lon": 34.5952419
    },
    {
      "type": "node",
      "id": 3709736063,
      "lat": 31.688495,
      "lon": 34.5964891
    },
    {
      "type": "node",
      "id": 3709736064,
      "lat": 31.6868343,
      "lon": 34.5943632
    },
    {
      "type": "node",
      "id": 3709736076,
      "lat": 31.6856916,
      "lon": 34.5952797
    },
    {
      "type": "node",
      "id": 3709736085,
      "lat": 31.6815814,
      "lon": 34.5921084
    },
    {
      "type": "node",
      "id": 3709736090,
      "lat": 31.6829621,
      "lon": 34.592711
    },
    {
      "type": "node",
      "id": 3709736092,
      "lat": 31.6833651,
      "lon": 34.5914151
    },
    {
      "type": "node",
      "id": 3709736093,
      "lat": 31.6822307,
      "lon": 34.5952616
    },
    {
      "type": "node",
      "id": 3709736094,
      "lat": 31.6872365,
      "lon": 34.5930734
    },
    {
      "type": "node",
      "id": 3709736096,
      "lat": 31.6811983,
      "lon": 34.5933538
    },
    {
      "type": "node",
      "id": 3709736101,
      "lat": 31.6864445,
      "lon": 34.5956133
    },
    {
      "type": "node",
      "id": 3709736106,
      "lat": 31.6825691,
      "lon": 34.5939564
    },
    {
      "type": "node",
      "id": 3709736116,
      "lat": 31.6874799,
      "lon": 34.5960535
    },
    {
      "type": "node",
      "id": 3709736117,
      "lat": 31.6870738,
      "lon": 34.5973555
    },
    {
      "type": "node",
      "id": 3709736118,
      "lat": 31.6860792,
      "lon": 34.594038
    },
    {
      "type": "node",
      "id": 3709736119,
      "lat": 31.6843079,
      "lon": 34.5961533
    },
    {
      "type": "node",
      "id": 3709736123,
      "lat": 31.684716,
      "lon": 34.59486
    },
    {
      "type": "node",
      "id": 3709736128,
      "lat": 31.6831778,
      "lon": 34.5942132
    },
    {
      "type": "node",
      "id": 3709736130,
      "lat": 31.6835675,
      "lon": 34.5929566
    },
    {
      "type": "node",
      "id": 3709736132,
      "lat": 31.6878705,
      "lon": 34.5948014
    },
    {
      "type": "node",
      "id": 3709736135,
      "lat": 31.685501,
      "lon": 34.59233
    },
    {
      "type": "node",
      "id": 5207288892,
      "lat": 31.6842943,
      "lon": 34.5962872
    },
    {
      "type": "node",
      "id": 5249062592,
      "lat": 31.6801241,
      "lon": 34.5952877
    },
    {
      "type": "node",
      "id": 5249066566,
      "lat": 31.6807675,
      "lon": 34.5965825
    },
    {
      "type": "node",
      "id": 5931062449,
      "lat": 31.6809573,
      "lon": 34.5981269
    },
    {
      "type": "node",
      "id": 5931062450,
      "lat": 31.6808338,
      "lon": 34.598111
    },
    {
      "type": "node",
      "id": 5931062451,
      "lat": 31.6819205,
      "lon": 34.5982063
    },
    {
      "type": "node",
      "id": 5931062453,
      "lat": 31.6871201,
      "lon": 34.6009007
    },
    {
      "type": "node",
      "id": 5931062454,
      "lat": 31.685969,
      "lon": 34.5995968
    },
    {
      "type": "node",
      "id": 5931062455,
      "lat": 31.6845583,
      "lon": 34.5988692
    },
    {
      "type": "node",
      "id": 6018286055,
      "lat": 31.6796534,
      "lon": 34.5963206
    },
    {
      "type": "node",
      "id": 6018286056,
      "lat": 31.6807324,
      "lon": 34.5960584
    },
    {
      "type": "node",
      "id": 6018286057,
      "lat": 31.6806148,
      "lon": 34.5960771
    },
    {
      "type": "node",
      "id": 6708630443,
      "lat": 31.6839429,
      "lon": 34.5917534
    },
    {
      "type": "node",
      "id": 6708696514,
      "lat": 31.6828282,
      "lon": 34.5954337
    },
    {
      "type": "node",
      "id": 6708696515,
      "lat": 31.6827624,
      "lon": 34.5954066
    },
    {
      "type": "node",
      "id": 6708696516,
      "lat": 31.682851,
      "lon": 34.5954587
    },
    {
      "type": "node",
      "id": 6708696517,
      "lat": 31.6811462,
      "lon": 34.6020946
    },
    {
      "type": "node",
      "id": 6708696518,
      "lat": 31.681327,
      "lon": 34.6023836
    },
    {
      "type": "node",
      "id": 6708696519,
      "lat": 31.6826841,
      "lon": 34.5956706
    },
    {
      "type": "node",
      "id": 6708696521,
      "lat": 31.6827778,
      "lon": 34.5956953
    },
    {
      "type": "node",
      "id": 6708696523,
      "lat": 31.6827443,
      "lon": 34.5956969
    },
    {
      "type": "node",
      "id": 6708696524,
      "lat": 31.6870462,
      "lon": 34.6016519
    },
    {
      "type": "node",
      "id": 6708696525,
      "lat": 31.6810996,
      "lon": 34.6019369
    },
    {
      "type": "node",
      "id": 6708696526,
      "lat": 31.6828775,
      "lon": 34.5955242
    },
    {
      "type": "node",
      "id": 6708696527,
      "lat": 31.6826611,
      "lon": 34.5956457
    },
    {
      "type": "node",
      "id": 6708696528,
      "lat": 31.6810542,
      "lon": 34.6021451
    },
    {
      "type": "node",
      "id": 6708696529,
      "lat": 31.6809768,
      "lon": 34.6018137
    },
    {
      "type": "node",
      "id": 6708696530,
      "lat": 31.6814686,
      "lon": 34.6025172
    },
    {
      "type": "node",
      "id": 6708696531,
      "lat": 31.6885356,
      "lon": 34.6022918
    },
    {
      "type": "node",
      "id": 6708696532,
      "lat": 31.6826343,
      "lon": 34.5955798
    },
    {
      "type": "node",
      "id": 6708696533,
      "lat": 31.6870919,
      "lon": 34.6014844
    },
    {
      "type": "node",
      "id": 6708696534,
      "lat": 31.6812245,
      "lon": 34.6022479
    },
    {
      "type": "node",
      "id": 6708696535,
      "lat": 31.6810018,
      "lon": 34.6019676
    },
    {
      "type": "node",
      "id": 6708696537,
      "lat": 31.680932,
      "lon": 34.6007828
    },
    {
      "type": "node",
      "id": 6708696538,
      "lat": 31.6809652,
      "lon": 34.6015896
    },
    {
      "type": "node",
      "id": 6708696543,
      "lat": 31.6817464,
      "lon": 34.6027662
    },
    {
      "type": "node",
      "id": 6708696546,
      "lat": 31.6812571,
      "lon": 34.6024699
    },
    {
      "type": "node",
      "id": 6708696548,
      "lat": 31.6811427,
      "lon": 34.6023184
    },
    {
      "type": "node",
      "id": 6708696551,
      "lat": 31.6815762,
      "lon": 34.6027143
    },
    {
      "type": "node",
      "id": 6708696552,
      "lat": 31.6827256,
      "lon": 34.6027585
    },
    {
      "type": "node",
      "id": 6708696553,
      "lat": 31.6828731,
      "lon": 34.5955991
    },
    {
      "type": "node",
      "id": 6708696554,
      "lat": 31.6823285,
      "lon": 34.6027716
    },
    {
      "type": "node",
      "id": 6708696556,
      "lat": 31.6819299,
      "lon": 34.6027827
    },
    {
      "type": "node",
      "id": 6708696557,
      "lat": 31.6828376,
      "lon": 34.5956615
    },
    {
      "type": "node",
      "id": 6708696558,
      "lat": 31.6814136,
      "lon": 34.6026175
    },
    {
      "type": "node",
      "id": 6708696563,
      "lat": 31.6880249,
      "lon": 34.5980083
    },
    {
      "type": "node",
      "id": 6708696568,
      "lat": 31.6828678,
      "lon": 34.5954895
    },
    {
      "type": "node",
      "id": 6708696571,
      "lat": 31.6879772,
      "lon": 34.5979126
    },
    {
      "type": "node",
      "id": 6708696573,
      "lat": 31.6827228,
      "lon": 34.6026399
    },
    {
      "type": "node",
      "id": 6708696574,
      "lat": 31.6869902,
      "lon": 34.6016755
    },
    {
      "type": "node",
      "id": 6708696575,
      "lat": 31.6823258,
      "lon": 34.602653
    },
    {
      "type": "node",
      "id": 6708696577,
      "lat": 31.6819326,
      "lon": 34.6026639
    },
    {
      "type": "node",
      "id": 6708696578,
      "lat": 31.681763,
      "lon": 34.6026486
    },
    {
      "type": "node",
      "id": 6708696579,
      "lat": 31.686911,
      "lon": 34.6014163
    },
    {
      "type": "node",
      "id": 6708696580,
      "lat": 31.6816121,
      "lon": 34.6026026
    },
    {
      "type": "node",
      "id": 6708696581,
      "lat": 31.6826417,
      "lon": 34.5954957
    },
    {
      "type": "node",
      "id": 6708696582,
      "lat": 31.6827233,
      "lon": 34.5954115
    },
    {
      "type": "node",
      "id": 6708696583,
      "lat": 31.6827117,
      "lon": 34.595688
    },
    {
      "type": "node",
      "id": 6708696584,
      "lat": 31.6826441,
      "lon": 34.5956147
    },
    {
      "type": "node",
      "id": 6708709685,
      "lat": 31.6826327,
      "lon": 34.5955371
    },
    {
      "type": "node",
      "id": 6708709687,
      "lat": 31.6870886,
      "lon": 34.6015931
    },
    {
      "type": "node",
      "id": 6708709688,
      "lat": 31.6826875,
      "lon": 34.5954306
    },
    {
      "type": "node",
      "id": 6708709689,
      "lat": 31.6826605,
      "lon": 34.5954591
    },
    {
      "type": "node",
      "id": 6708709690,
      "lat": 31.6870981,
      "lon": 34.6015558
    },
    {
      "type": "node",
      "id": 6708709691,
      "lat": 31.6869388,
      "lon": 34.6013999
    },
    {
      "type": "node",
      "id": 6708709692,
      "lat": 31.6870708,
      "lon": 34.6016259
    },
    {
      "type": "node",
      "id": 6708709693,
      "lat": 31.6868667,
      "lon": 34.6014803
    },
    {
      "type": "node",
      "id": 6708709694,
      "lat": 31.6870577,
      "lon": 34.6014267
    },
    {
      "type": "node",
      "id": 6708709695,
      "lat": 31.687001,
      "lon": 34.6013945
    },
    {
      "type": "node",
      "id": 6708709697,
      "lat": 31.686927,
      "lon": 34.6016626
    },
    {
      "type": "node",
      "id": 6708709698,
      "lat": 31.6868999,
      "lon": 34.6016419
    },
    {
      "type": "node",
      "id": 6708709699,
      "lat": 31.6868671,
      "lon": 34.601589
    },
    {
      "type": "node",
      "id": 6708709700,
      "lat": 31.6869693,
      "lon": 34.6013924
    },
    {
      "type": "node",
      "id": 6708709702,
      "lat": 31.6869579,
      "lon": 34.6016741
    },
    {
      "type": "node",
      "id": 6708709706,
      "lat": 31.6868848,
      "lon": 34.6014444
    },
    {
      "type": "node",
      "id": 6708709707,
      "lat": 31.6870194,
      "lon": 34.6016678
    },
    {
      "type": "node",
      "id": 6708709708,
      "lat": 31.6870312,
      "lon": 34.6014062
    },
    {
      "type": "node",
      "id": 6708709709,
      "lat": 31.6868582,
      "lon": 34.6015208
    },
    {
      "type": "node",
      "id": 6708709710,
      "lat": 31.6810773,
      "lon": 34.6017989
    },
    {
      "type": "node",
      "id": 6708709712,
      "lat": 31.6828795,
      "lon": 34.595562
    },
    {
      "type": "node",
      "id": 6708709714,
      "lat": 31.6868784,
      "lon": 34.6016135
    },
    {
      "type": "node",
      "id": 6708709717,
      "lat": 31.6828008,
      "lon": 34.5954163
    },
    {
      "type": "node",
      "id": 6708709718,
      "lat": 31.6868601,
      "lon": 34.6015624
    },
    {
      "type": "node",
      "id": 6708709719,
      "lat": 31.6828588,
      "lon": 34.595633
    },
    {
      "type": "node",
      "id": 6708709721,
      "lat": 31.6810661,
      "lon": 34.6015843
    },
    {
      "type": "node",
      "id": 6708709725,
      "lat": 31.6880131,
      "lon": 34.5977619
    },
    {
      "type": "node",
      "id": 6708709726,
      "lat": 31.6870788,
      "lon": 34.6014546
    },
    {
      "type": "node",
      "id": 6708709729,
      "lat": 31.6870986,
      "lon": 34.6015169
    },
    {
      "type": "node",
      "id": 7133171702,
      "lat": 31.6818033,
      "lon": 34.5910336
    },
    {
      "type": "node",
      "id": 7133171707,
      "lat": 31.6815207,
      "lon": 34.5919561
    },
    {
      "type": "node",
      "id": 7148354640,
      "lat": 31.6864022,
      "lon": 34.6037322
    },
    {
      "type": "node",
      "id": 7148354641,
      "lat": 31.6862418,
      "lon": 34.6036328
    },
    {
      "type": "node",
      "id": 7148354642,
      "lat": 31.6864311,
      "lon": 34.6037097
    },
    {
      "type": "node",
      "id": 7148354643,
      "lat": 31.6864615,
      "lon": 34.6036319
    },
    {
      "type": "node",
      "id": 7148354644,
      "lat": 31.6862744,
      "lon": 34.603521
    },
    {
      "type": "node",
      "id": 7148354645,
      "lat": 31.6863937,
      "lon": 34.6037388
    },
    {
      "type": "node",
      "id": 7148354646,
      "lat": 31.6863516,
      "lon": 34.6037485
    },
    {
      "type": "node",
      "id": 7148354647,
      "lat": 31.6864122,
      "lon": 34.6035081
    },
    {
      "type": "node",
      "id": 7148354648,
      "lat": 31.686272,
      "lon": 34.6037097
    },
    {
      "type": "node",
      "id": 7148354649,
      "lat": 31.6863094,
      "lon": 34.6037388
    },
    {
      "type": "node",
      "id": 7148354650,
      "lat": 31.6863235,
      "lon": 34.6034905
    },
    {
      "type": "node",
      "id": 7148354651,
      "lat": 31.6862473,
      "lon": 34.6036658
    },
    {
      "type": "node",
      "id": 7148354652,
      "lat": 31.6864243,
      "lon": 34.6031161
    },
    {
      "type": "node",
      "id": 7148354653,
      "lat": 31.6862391,
      "lon": 34.6036163
    },
    {
      "type": "node",
      "id": 7148354654,
      "lat": 31.6863659,
      "lon": 34.6033209
    },
    {
      "type": "node",
      "id": 7148354655,
      "lat": 31.6864559,
      "lon": 34.6036658
    },
    {
      "type": "node",
      "id": 7148354656,
      "lat": 31.6862473,
      "lon": 34.6035668
    },
    {
      "type": "node",
      "id": 7148354657,
      "lat": 31.686272,
      "lon": 34.6035228
    },
    {
      "type": "node",
      "id": 7148354658,
      "lat": 31.6864641,
      "lon": 34.6036163
    },
    {
      "type": "node",
      "id": 7148354659,
      "lat": 31.6863094,
      "lon": 34.6034937
    },
    {
      "type": "node",
      "id": 7148354660,
      "lat": 31.6863516,
      "lon": 34.6034841
    },
    {
      "type": "node",
      "id": 7148354661,
      "lat": 31.6863937,
      "lon": 34.6034937
    },
    {
      "type": "node",
      "id": 7148354662,
      "lat": 31.6864311,
      "lon": 34.6035228
    },
    {
      "type": "node",
      "id": 7148354663,
      "lat": 31.6864559,
      "lon": 34.6035668
    },
    {
      "type": "node",
      "id": 7591402464,
      "lat": 31.6828096,
      "lon": 34.5956832
    },
    {
      "type": "node",
      "id": 8594513620,
      "lat": 31.6777911,
      "lon": 34.6050444
    },
    {
      "type": "node",
      "id": 9743806904,
      "lat": 31.6795208,
      "lon": 34.6005591
    },
    {
      "type": "node",
      "id": 10160134452,
      "lat": 31.6788992,
      "lon": 34.5964966
    },
    {
      "type": "node",
      "id": 10160134453,
      "lat": 31.6787308,
      "lon": 34.5960025
    },
    {
      "type": "node",
      "id": 10160134463,
      "lat": 31.679353,
      "lon": 34.5954522
    },
    {
      "type": "node",
      "id": 10196677513,
      "lat": 31.6793146,
      "lon": 34.6006405
    },
    {
      "type": "node",
      "id": 10196677514,
      "lat": 31.6793132,
      "lon": 34.6005623
    },
    {
      "type": "node",
      "id": 10196677515,
      "lat": 31.6793196,
      "lon": 34.6007078
    },
    {
      "type": "node",
      "id": 11180689017,
      "lat": 31.6810583,
      "lon": 34.5934659
    },
    {
      "type": "node",
      "id": 11180689021,
      "lat": 31.681127,
      "lon": 34.5932415
    },
    {
      "type": "node",
      "id": 11180689022,
      "lat": 31.6813218,
      "lon": 34.5934321
    },
    {
      "type": "node",
      "id": 11180689023,
      "lat": 31.6811459,
      "lon": 34.5935243
    },
    {
      "type": "node",
      "id": 11180689033,
      "lat": 31.6812334,
      "lon": 34.5932398
    },
    {
      "type": "node",
      "id": 11180744899,
      "lat": 31.6818471,
      "lon": 34.5936529
    },
    {
      "type": "node",
      "id": 11180759544,
      "lat": 31.680999,
      "lon": 34.594002
    },
    {
      "type": "node",
      "id": 11180759546,
      "lat": 31.6824025,
      "lon": 34.5945798
    },
    {
      "type": "node",
      "id": 11180761333,
      "lat": 31.686183,
      "lon": 34.5930449
    },
    {
      "type": "node",
      "id": 11180770845,
      "lat": 31.6864202,
      "lon": 34.5929452
    },
    {
      "type": "node",
      "id": 11236453115,
      "lat": 31.6809811,
      "lon": 34.5951644
    },
    {
      "type": "node",
      "id": 11502888069,
      "lat": 31.6851844,
      "lon": 34.5969008
    },
    {
      "type": "node",
      "id": 11502888070,
      "lat": 31.6852484,
      "lon": 34.5968402
    },
    {
      "type": "node",
      "id": 11502888071,
      "lat": 31.6853342,
      "lon": 34.5968059
    },
    {
      "type": "node",
      "id": 11502888072,
      "lat": 31.6854561,
      "lon": 34.596791
    },
    {
      "type": "node",
      "id": 11502888073,
      "lat": 31.6854796,
      "lon": 34.5966643
    },
    {
      "type": "node",
      "id": 11502888074,
      "lat": 31.6854219,
      "lon": 34.5966042
    },
    {
      "type": "node",
      "id": 11502888075,
      "lat": 31.6853835,
      "lon": 34.5965441
    },
    {
      "type": "node",
      "id": 11502888076,
      "lat": 31.6853653,
      "lon": 34.5964647
    },
    {
      "type": "node",
      "id": 11502888077,
      "lat": 31.6853553,
      "lon": 34.5963571
    },
    {
      "type": "node",
      "id": 11502888078,
      "lat": 31.6851871,
      "lon": 34.5962265
    },
    {
      "type": "node",
      "id": 11502888079,
      "lat": 31.6851188,
      "lon": 34.5963081
    },
    {
      "type": "node",
      "id": 11502888080,
      "lat": 31.6850695,
      "lon": 34.5963574
    },
    {
      "type": "node",
      "id": 11502888081,
      "lat": 31.6850001,
      "lon": 34.5963896
    },
    {
      "type": "node",
      "id": 11502888082,
      "lat": 31.6848701,
      "lon": 34.5963943
    },
    {
      "type": "node",
      "id": 11502888083,
      "lat": 31.6848294,
      "lon": 34.5965179
    },
    {
      "type": "node",
      "id": 11502888084,
      "lat": 31.6848869,
      "lon": 34.5966085
    },
    {
      "type": "node",
      "id": 11502888085,
      "lat": 31.6849179,
      "lon": 34.5966836
    },
    {
      "type": "node",
      "id": 11502888086,
      "lat": 31.6849435,
      "lon": 34.5967802
    },
    {
      "type": "node",
      "id": 11502888087,
      "lat": 31.684958,
      "lon": 34.5969542
    },
    {
      "type": "node",
      "id": 11502888088,
      "lat": 31.6839594,
      "lon": 34.6008532
    },
    {
      "type": "node",
      "id": 11502888089,
      "lat": 31.6840745,
      "lon": 34.6007774
    },
    {
      "type": "node",
      "id": 11502888090,
      "lat": 31.6842104,
      "lon": 34.6007162
    },
    {
      "type": "node",
      "id": 11502888092,
      "lat": 31.6842236,
      "lon": 34.600594
    },
    {
      "type": "node",
      "id": 11502888093,
      "lat": 31.6841656,
      "lon": 34.6004971
    },
    {
      "type": "node",
      "id": 11502888094,
      "lat": 31.684128,
      "lon": 34.6004017
    },
    {
      "type": "node",
      "id": 11502888095,
      "lat": 31.6841225,
      "lon": 34.6003076
    },
    {
      "type": "node",
      "id": 11502888096,
      "lat": 31.6838987,
      "lon": 34.6002947
    },
    {
      "type": "node",
      "id": 11502888097,
      "lat": 31.6838555,
      "lon": 34.6003592
    },
    {
      "type": "node",
      "id": 11502888098,
      "lat": 31.683812,
      "lon": 34.6004086
    },
    {
      "type": "node",
      "id": 11502888099,
      "lat": 31.6837671,
      "lon": 34.6004443
    },
    {
      "type": "node",
      "id": 11502888100,
      "lat": 31.683664,
      "lon": 34.6005118
    },
    {
      "type": "node",
      "id": 11502888102,
      "lat": 31.683683,
      "lon": 34.6007543
    },
    {
      "type": "node",
      "id": 11502888103,
      "lat": 31.6837073,
      "lon": 34.6009021
    },
    {
      "type": "node",
      "id": 11502888104,
      "lat": 31.6836627,
      "lon": 34.6006998
    },
    {
      "type": "node",
      "id": 11595797271,
      "lat": 31.6817077,
      "lon": 34.5921653
    },
    {
      "type": "node",
      "id": 11595797276,
      "lat": 31.681537,
      "lon": 34.5922527
    },
    {
      "type": "node",
      "id": 11595797282,
      "lat": 31.6816266,
      "lon": 34.5919619
    },
    {
      "type": "node",
      "id": 11898504779,
      "lat": 31.6802854,
      "lon": 34.5961605
    },
    {
      "type": "node",
      "id": 11898504780,
      "lat": 31.6802349,
      "lon": 34.5961733
    },
    {
      "type": "node",
      "id": 11898504782,
      "lat": 31.6801217,
      "lon": 34.596202
    },
    {
      "type": "node",
      "id": 11898526802,
      "lat": 31.6871652,
      "lon": 34.5975514
    },
    {
      "type": "node",
      "id": 11898526803,
      "lat": 31.6864774,
      "lon": 34.5972454
    },
    {
      "type": "node",
      "id": 11898527057,
      "lat": 31.6813514,
      "lon": 34.5928561
    },
    {
      "type": "node",
      "id": 11898527058,
      "lat": 31.682737,
      "lon": 34.5934242
    },
    {
      "type": "node",
      "id": 11898527072,
      "lat": 31.6814097,
      "lon": 34.5926665
    },
    {
      "type": "node",
      "id": 11898527094,
      "lat": 31.6827803,
      "lon": 34.5932872
    },
    {
      "type": "node",
      "id": 11898527119,
      "lat": 31.6818023,
      "lon": 34.5913918
    },
    {
      "type": "node",
      "id": 11898527124,
      "lat": 31.6831395,
      "lon": 34.5921407
    },
    {
      "type": "node",
      "id": 11900286716,
      "lat": 31.6790914,
      "lon": 34.5938964
    },
    {
      "type": "node",
      "id": 11900286718,
      "lat": 31.6775386,
      "lon": 34.5920263
    },
    {
      "type": "node",
      "id": 11900286736,
      "lat": 31.6836783,
      "lon": 34.5944237
    },
    {
      "type": "node",
      "id": 11900286751,
      "lat": 31.6853053,
      "lon": 34.5929587
    },
    {
      "type": "node",
      "id": 11900322523,
      "lat": 31.682997,
      "lon": 34.5947903
    },
    {
      "type": "node",
      "id": 11900322553,
      "lat": 31.6845273,
      "lon": 34.5954579
    },
    {
      "type": "node",
      "id": 11900322561,
      "lat": 31.6830327,
      "lon": 34.5927396
    },
    {
      "type": "node",
      "id": 11900322562,
      "lat": 31.6830982,
      "lon": 34.5941796
    },
    {
      "type": "node",
      "id": 11900322814,
      "lat": 31.6870344,
      "lon": 34.5937214
    },
    {
      "type": "node",
      "id": 11900323020,
      "lat": 31.6879626,
      "lon": 34.5962606
    },
    {
      "type": "node",
      "id": 12219581388,
      "lat": 31.6808258,
      "lon": 34.5958941
    },
    {
      "type": "node",
      "id": 12219581389,
      "lat": 31.6810766,
      "lon": 34.5985434
    },
    {
      "type": "node",
      "id": 12219581390,
      "lat": 31.6814137,
      "lon": 34.5985478
    },
    {
      "type": "node",
      "id": 12219581391,
      "lat": 31.6839799,
      "lon": 34.5996316
    },
    {
      "type": "node",
      "id": 12219581392,
      "lat": 31.6840432,
      "lon": 34.5996153
    },
    {
      "type": "node",
      "id": 12219581393,
      "lat": 31.6840129,
      "lon": 34.5996865
    },
    {
      "type": "node",
      "id": 12219581394,
      "lat": 31.6840419,
      "lon": 34.5997456
    },
    {
      "type": "node",
      "id": 12219581395,
      "lat": 31.6840532,
      "lon": 34.5997899
    },
    {
      "type": "node",
      "id": 12219581396,
      "lat": 31.6810275,
      "lon": 34.5985958
    },
    {
      "type": "node",
      "id": 12219581397,
      "lat": 31.6809817,
      "lon": 34.5986616
    },
    {
      "type": "node",
      "id": 12219581398,
      "lat": 31.681032,
      "lon": 34.5984982
    },
    {
      "type": "node",
      "id": 12219581399,
      "lat": 31.6833988,
      "lon": 34.6006358
    },
    {
      "type": "node",
      "id": 12219581400,
      "lat": 31.6821508,
      "lon": 34.600655
    },
    {
      "type": "node",
      "id": 12219581401,
      "lat": 31.6815322,
      "lon": 34.6006658
    },
    {
      "type": "node",
      "id": 12771447481,
      "lat": 31.6788761,
      "lon": 34.5957451
    },
    {
      "type": "node",
      "id": 12771447483,
      "lat": 31.6787483,
      "lon": 34.5960487
    },
    {
      "type": "node",
      "id": 13032152785,
      "lat": 31.6842603,
      "lon": 34.5932562
    },
    {
      "type": "node",
      "id": 13526949033,
      "lat": 31.6797143,
      "lon": 34.6005603
    },
    {
      "type": "node",
      "id": 13526949034,
      "lat": 31.6796355,
      "lon": 34.600514
    },
    {
      "type": "node",
      "id": 13526949035,
      "lat": 31.6795674,
      "lon": 34.600429
    },
    {
      "type": "node",
      "id": 13526949036,
      "lat": 31.6794611,
      "lon": 34.6001914
    },
    {
      "type": "node",
      "id": 13526949037,
      "lat": 31.6795043,
      "lon": 34.6011747
    },
    {
      "type": "node",
      "id": 13526949038,
      "lat": 31.6795229,
      "lon": 34.6010104
    },
    {
      "type": "node",
      "id": 13526949039,
      "lat": 31.6795488,
      "lon": 34.6009007
    },
    {
      "type": "node",
      "id": 13526949040,
      "lat": 31.6795879,
      "lon": 34.6008051
    },
    {
      "type": "node",
      "id": 13526949041,
      "lat": 31.6797084,
      "lon": 34.6007
    },
    {
      "type": "node",
      "id": 13526949042,
      "lat": 31.6796397,
      "lon": 34.6007434
    },
    {
      "type": "node",
      "id": 13526949043,
      "lat": 31.6795024,
      "lon": 34.6003187
    }
  ]
}

---
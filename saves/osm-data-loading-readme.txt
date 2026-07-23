https://overpass-turbo.eu/

---

OSM FILTER:

[out:json];
(
  way["highway"]
  ["highway" !~"pedestrian|footway|cycleway|path|service|corridor|track|steps|raceway|bridleway|proposed|construction|elevator|bus_guideway|no"]
  ["access" !~"private"]
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
    "timestamp_osm_base": "2026-07-23T15:19:44Z",
    "copyright": "The data included in this document is from www.openstreetmap.org. The data is made available under ODbL."
  },
  "elements": [
    {
      "type": "way",
      "id": 34071767,
      "nodes": [
        390445392,
        12771447488,
        10160134460,
        10160134450,
        10160134449,
        10160134448,
        10160134447,
        10160134446,
        10160134445,
        1345135106,
        1345134969
      ],
      "tags": {
        "alt_name:en": "HaTa'asiya",
        "alt_name:he": "התעשייה",
        "highway": "tertiary",
        "lanes": "2",
        "name": "התעשיה",
        "name:en": "HaTaasiya",
        "name:he": "התעשיה",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 34071806,
      "nodes": [
        11742971048,
        390421084,
        3924172684,
        390421083,
        3924172671,
        2132379514,
        390420919
      ],
      "tags": {
        "alt_name:en": "HaTa'asiya",
        "alt_name:he": "התעשייה",
        "highway": "tertiary",
        "name": "התעשיה",
        "name:en": "HaTaasiya",
        "name:he": "התעשיה"
      }
    },
    {
      "type": "way",
      "id": 34072816,
      "nodes": [
        1808113258,
        12771531114,
        1808113316,
        1112219120
      ],
      "tags": {
        "highway": "residential",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 46045721,
      "nodes": [
        390430484,
        11613689434,
        1808065109
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
      "id": 46045725,
      "nodes": [
        2247744399,
        1344792948,
        12771447484,
        3485984929,
        3485984643,
        12771447486,
        1617058815,
        390440023,
        2127251969,
        390440024,
        390440025,
        1345736426,
        3708142667,
        390440026,
        390440027,
        390440028,
        2127251966,
        390440029,
        6025530418,
        390440030
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
      "id": 54039972,
      "nodes": [
        7740501652,
        1395072497,
        1395071918,
        681336146,
        1395072235,
        1469266613,
        1395072537,
        681336150,
        1395072057,
        1395072173,
        1395072405,
        1395072053,
        681336154
      ],
      "tags": {
        "highway": "residential",
        "name": "עמישב",
        "name:en": "Amishav",
        "name:he": "עמישב",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 119815730,
      "nodes": [
        1345134984,
        7806423683,
        7806423684,
        1345134969,
        1345134987,
        1345134704,
        4260308986,
        1345134952,
        1345134788,
        1345135060,
        1345134832,
        1345134713,
        7806423680,
        1345134709,
        1345134735,
        1345134836,
        1345134863,
        3608459891,
        1345135064,
        1345134694,
        7806430487,
        1345134834,
        3608459892,
        1345134984
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 133494568,
      "nodes": [
        1469266459,
        1395072057
      ],
      "tags": {
        "alt_name:en": "Ha'Bashan",
        "highway": "living_street",
        "name": "הבשן",
        "name:ar": "هَبَشان",
        "name:en": "HaBashan",
        "name:he": "הבשן"
      }
    },
    {
      "type": "way",
      "id": 134063896,
      "nodes": [
        1474515623,
        1474515685,
        1474515671,
        1474515605,
        12771447490,
        1474515677,
        10982165617,
        10160134460
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 134063899,
      "nodes": [
        10160134461,
        1474515627,
        12771447491,
        1474515663,
        1474515635,
        1474515626,
        10160134452
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169636222,
      "nodes": [
        1345135017,
        1808065030,
        1808065149,
        1808065335,
        1808065027,
        1808065054,
        1808065228,
        1808065183,
        1808065289,
        1808065260,
        1808065288,
        1808065209,
        1808065140
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
      "id": 169636223,
      "nodes": [
        1808065263,
        1808065113,
        1808065246,
        1808065111,
        1808065140,
        1808065236,
        1808065117,
        8941633126,
        3477542848,
        1808065195,
        1808065112,
        3477543251,
        8941632975,
        1808065185,
        1808065107,
        1808065157,
        3608459847,
        8941633093,
        1808065110,
        1808065086,
        1808065052,
        1808065292,
        1808065148,
        1808065143,
        1808065269,
        1808065118
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
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
      "id": 169636225,
      "nodes": [
        1808065042,
        1808065184,
        1808065294,
        1808065144,
        1808065038,
        1808065102,
        1808065230,
        12771520275,
        1808065088,
        12771447474,
        1808065153,
        1808065146,
        1808065330,
        1808065109
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "lane_markings": "no",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169636227,
      "nodes": [
        1808065263,
        1808065193,
        1808065248,
        1808065032,
        1808065046,
        1808065066,
        1808065106,
        1808065078,
        1808065062,
        1808065050,
        1808065044
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
      "id": 169636228,
      "nodes": [
        4616078646,
        12771531112,
        1808065331,
        1808065338,
        13007231044,
        1808065332,
        1808065040
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169636229,
      "nodes": [
        1808065328,
        1808065181,
        1808065305,
        1808065162,
        1808065296,
        4730768491,
        1808065042
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169636230,
      "nodes": [
        390430484,
        1808065048,
        1808065092,
        12771447473,
        1808065286,
        1808065326,
        1808065298,
        1808065226,
        1808065337,
        1808065145,
        1808065100
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "lane_markings": "no",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169640924,
      "nodes": [
        1808113250,
        12771531119,
        1808113343,
        1808113338,
        1808113339,
        1808065328
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 169640934,
      "nodes": [
        1808113348,
        1808113346,
        1808113344,
        1808113349,
        1808113305,
        12771531117,
        1808113397
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 203244820,
      "nodes": [
        2132379501,
        2132379488,
        2132379508,
        2132379496,
        2132379511,
        2132379521,
        2132379546,
        2132379518,
        2132379520,
        1345134863
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 206653938,
      "nodes": [
        198652794,
        2166943877,
        2166943856,
        2166943840,
        12771447470,
        2166943875,
        2166943879
      ],
      "tags": {
        "destination": "ירושלים;באר שבע",
        "destination:ref": "4",
        "highway": "trunk_link",
        "lane_markings": "no",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 206653940,
      "nodes": [
        2166943862,
        2166943866,
        2166943859,
        12771447465,
        2166943826,
        2166943863,
        2166943873
      ],
      "tags": {
        "destination": "אשקלון (צפון)",
        "highway": "trunk_link",
        "lane_markings": "no",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 215358108,
      "nodes": [
        3477543924,
        10160134459,
        2247744452,
        12771447485,
        2247744425,
        3485984647,
        390440023
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 215358111,
      "nodes": [
        2247744399,
        2247744412,
        3485984657,
        12771447480,
        2247744481,
        11613689435,
        3477543938
      ],
      "tags": {
        "highway": "secondary_link",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 306172432,
      "nodes": [
        1808065109,
        5357538744,
        1808065096,
        1808065299,
        1345135036,
        1345134745,
        1474519360,
        1808065123,
        198652794
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
      "id": 306172435,
      "nodes": [
        1504450401,
        3110168819,
        4403234150,
        4403234149
      ],
      "tags": {
        "destination": "קרית מלאכי;ירושלים",
        "destination:ref": "3",
        "highway": "trunk_link",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 306172436,
      "nodes": [
        411886114,
        390438965
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
      "id": 306173312,
      "nodes": [
        1345135017,
        11613689433,
        1808065044
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
      "id": 306204295,
      "nodes": [
        7169205566,
        7169205460,
        7169205461,
        7169205459,
        7169205442,
        7169205462,
        7169205402,
        7169205395,
        7169205401,
        7169205399,
        1146894017,
        1146894012,
        1146894023,
        2051812207,
        2051812210,
        2051812212,
        2051812205,
        1146893994,
        129595905,
        2051812204,
        2051812213,
        1146893997,
        5357534700,
        2051812211,
        3110188129,
        1474519347,
        2166943862,
        12771447468,
        390438965
      ],
      "tags": {
        "highway": "trunk",
        "lanes": "2",
        "maxspeed:type": "IL:trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 340518573,
      "nodes": [
        3477543670,
        13606669834,
        3709736044,
        3709736113,
        6708696520
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
      "id": 340518584,
      "nodes": [
        3477543288,
        10248959551,
        10248959550,
        11595797196,
        3709736089,
        11595797192,
        7184277084,
        11595797184,
        10248959546,
        11595797189,
        10248959547,
        10248959548,
        3485984637
      ],
      "tags": {
        "highway": "tertiary",
        "lit": "yes",
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
      "id": 340518589,
      "nodes": [
        3477543243,
        3477543594,
        3477542876,
        3477543667,
        3477543925,
        3477543210,
        3477543208,
        3708142651
      ],
      "tags": {
        "highway": "tertiary",
        "lanes": "2",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
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
      "id": 340518594,
      "nodes": [
        3477543228,
        3477544169,
        3477543596,
        3477543243,
        3477544111,
        3477543966,
        3477543903,
        3477544106,
        3477543209,
        3477544099
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
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
      "id": 340518627,
      "nodes": [
        3477543974,
        3477543678,
        3709736092,
        11900322558,
        6708630436
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
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
      "id": 341400699,
      "nodes": [
        3485984691,
        6708696536
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
      "id": 341400705,
      "nodes": [
        3485984655,
        10248959545,
        11595797190,
        10248959544,
        7184294485,
        10248959549,
        3477543228
      ],
      "tags": {
        "highway": "tertiary",
        "lit": "yes",
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
      "id": 341400708,
      "nodes": [
        6708630394,
        3709736060,
        3709736063,
        6708696565
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
      "id": 355236422,
      "nodes": [
        8941633058,
        8941632966,
        8941633073,
        8941633066,
        8941633068,
        8941616616,
        8941633120
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 355236432,
      "nodes": [
        8941633074,
        8941616609,
        8941632952,
        8941633029,
        8941633107,
        8941632950,
        8941633047,
        8941633056,
        8941632970,
        8941632939,
        8941633130,
        8941633129,
        8941633048,
        8941633051,
        8941632951,
        8941633112,
        8941632980,
        8941633055
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 366832160,
      "nodes": [
        3708142559,
        3477544296,
        3477543273,
        3477543270,
        3477543238,
        3477543956,
        3477544179,
        3477543903
      ],
      "tags": {
        "highway": "tertiary",
        "lanes": "2",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832161,
      "nodes": [
        3708142572,
        3708142667
      ],
      "tags": {
        "highway": "residential",
        "name": "הבוצרים",
        "name:en": "HaBotsrim",
        "name:he": "הבוצרים",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832162,
      "nodes": [
        4799899719,
        3708142603,
        3708142560,
        3708142533
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
      "id": 366832167,
      "nodes": [
        6708709703,
        3708142579,
        3708142658,
        3708142548,
        3708142553,
        3708142550,
        3708142565
      ],
      "tags": {
        "highway": "residential",
        "name": "חכליל",
        "name:en": "Hakhlil",
        "name:he": "חכליל",
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
      "id": 366832170,
      "nodes": [
        3708142603,
        6708696576
      ],
      "tags": {
        "highway": "residential",
        "name": "חכליל",
        "name:en": "Hakhlil",
        "name:he": "חכליל",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832171,
      "nodes": [
        3708142560,
        3708141696
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
      "id": 366832173,
      "nodes": [
        3708142590,
        3708141700,
        3708142609,
        3708142662,
        3708141694,
        3708142656,
        3708142640,
        3708142594,
        3708142654,
        3708142660,
        3708142549,
        3708142608,
        3708142637,
        3708142545,
        3708142531,
        3708142597,
        3708142611,
        3708141695,
        3708142559,
        3708142592,
        3708142664,
        3708141699,
        3708142651,
        3708142590
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366832175,
      "nodes": [
        3708142619,
        3708141712,
        3708141711,
        3708141713,
        3708141714,
        3708141715,
        3708141716,
        3708141717,
        5249062577,
        3708142558
      ],
      "tags": {
        "highway": "residential",
        "name": "נחלה",
        "name:en": "Nahala",
        "name:he": "נחלה"
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
      "id": 366832177,
      "nodes": [
        3708142646,
        3708142616,
        3708142544,
        3708142642,
        3708142564,
        3708141693,
        3708142602,
        3708142558,
        3708142624,
        3708142648,
        3708142653,
        3708141702,
        3708142572,
        3708142556,
        3708142650,
        3708142663,
        3708142649,
        3708142547,
        3708142645,
        3708142557,
        3708142655,
        3708142646
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
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
      "id": 366832180,
      "nodes": [
        3708142531,
        5249062582,
        5249062579,
        3708142544
      ],
      "tags": {
        "highway": "residential",
        "name": "הבוצרים",
        "name:en": "HaBotsrim",
        "name:he": "הבוצרים"
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
      "id": 366832184,
      "nodes": [
        11180689013,
        3708142543,
        3708141724,
        3708142542,
        3708142538,
        3708142537,
        3708142534,
        3708142532,
        3708142530,
        3708142607,
        3708142529,
        3708142635
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
      "id": 366994831,
      "nodes": [
        3709736137,
        3709736144,
        3709736141,
        11341401056,
        3709736139
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
      "id": 366994833,
      "nodes": [
        3709736095,
        3709736140,
        11595797186,
        3709736097,
        3709736045,
        3709736047,
        3709736048,
        3709736081,
        3709736082,
        13076243787,
        13076243777,
        3709736122
      ],
      "tags": {
        "highway": "residential",
        "lanes": "2",
        "name": "הכורמים",
        "name:en": "HaKormim",
        "name:he": "הכורמים",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994835,
      "nodes": [
        11595797191,
        11595790837,
        11595797223,
        3709736140,
        11900322555,
        3709736028,
        3709736141,
        9163248164
      ],
      "tags": {
        "highway": "residential",
        "name": "ארגמן",
        "name:en": "Argaman",
        "name:he": "ארגמן",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994836,
      "nodes": [
        3709736025,
        11900286744,
        3709736144
      ],
      "tags": {
        "highway": "residential",
        "name": "יערה",
        "name:en": "Yaara",
        "name:he": "יערה",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994837,
      "nodes": [
        3709736084,
        3709736052,
        13606669837,
        3709736126,
        13606669832,
        4799899650
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
      "id": 366994839,
      "nodes": [
        3709736069,
        3709736083,
        3709736033,
        13606669830,
        13606669825,
        13606669827,
        4799899720
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
      "id": 366994840,
      "nodes": [
        3709736091,
        11900322579,
        3709736080,
        6708630424
      ],
      "tags": {
        "highway": "residential",
        "name": "עסיס ענבים",
        "name:en": "'Asis 'Anavim",
        "name:he": "עסיס ענבים",
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
      "id": 366994842,
      "nodes": [
        3709736078,
        3709736131,
        11900322711,
        3709736070,
        3709736077,
        3709736129,
        3709736065,
        3709736051,
        3709736103,
        5922766670,
        3709736079,
        3709736056,
        5922766672,
        3709736066
      ],
      "tags": {
        "highway": "residential",
        "name": "קונדיטון",
        "name:en": "Conditon",
        "name:he": "קונדיטון",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994843,
      "nodes": [
        3709736088,
        3709736099,
        3709736022
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
      "id": 366994844,
      "nodes": [
        6708630444,
        12768228015,
        3709736025,
        3709736028,
        11341401058,
        3709736087,
        3709736042,
        3709736040,
        3709736039,
        3709736038,
        3709736037,
        3709736036,
        3709736139
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
      "id": 366994850,
      "nodes": [
        6708630464,
        3709736033,
        13925753748,
        3709736126,
        3709736044
      ],
      "tags": {
        "highway": "residential",
        "name": "היינן",
        "name:en": "HaYanan",
        "name:he": "היינן",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994851,
      "nodes": [
        6708673591,
        3709736132,
        3709736116,
        3709736117
      ],
      "tags": {
        "highway": "residential",
        "name": "עסיס ענבים",
        "name:en": "'Asis 'Anavim",
        "name:he": "עסיס ענבים",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 366994852,
      "nodes": [
        3709736113,
        3709736052,
        3709736083,
        3709736030
      ],
      "tags": {
        "highway": "residential",
        "name": "קונדיטון",
        "name:en": "Conditon",
        "name:he": "קונדיטון",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 487536118,
      "nodes": [
        4799899682,
        4799899739,
        4799899740,
        4799899729,
        4799899673,
        4799899648
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "אריאל שרון",
        "name:ar": "ارييل شارون",
        "name:en": "Ariel Sharon",
        "name:he": "אריאל שרון",
        "name:ru": "Ариэль Шарон",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 487536125,
      "nodes": [
        4799899640,
        4799899755,
        4799899719,
        4799899676,
        4799899674,
        4799899683
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "אריאל שרון",
        "name:ar": "ارييل شارون",
        "name:en": "Ariel Sharon",
        "name:he": "אריאל שרון",
        "name:ru": "Ариэль Шарон",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 487537505,
      "nodes": [
        4799899679,
        4799899407,
        4799899404,
        4799899402,
        4799899401,
        4799899398,
        4799899748,
        4799899746,
        4799899750,
        4799899745,
        4799912245,
        4799912244,
        4799912243,
        4799912246
      ],
      "tags": {
        "highway": "tertiary",
        "name": "אריאל שרון",
        "name:ar": "ارييل شارون",
        "name:en": "Ariel Sharon",
        "name:he": "אריאל שרון",
        "name:ru": "Ариэль Шарон",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 487537508,
      "nodes": [
        4799912248,
        4799912252,
        4799911909,
        4799911910,
        4799899698,
        4799899700,
        4799899701,
        4799899702,
        4799899704,
        4799899709,
        4799899727,
        4799899710,
        4799899725,
        4799899689
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "אריאל שרון",
        "name:ar": "ارييل شارون",
        "name:en": "Ariel Sharon",
        "name:he": "אריאל שרון",
        "name:ru": "Ариэль Шарон",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 487537511,
      "nodes": [
        8941633126,
        8941632934,
        8941632927,
        8941632926,
        8941632936,
        8941632932,
        8941633034,
        8941633031,
        8941633032,
        8941633030,
        8941633111,
        8941633110,
        8941633006,
        8941633007,
        8941633008,
        8941633133,
        8941633078,
        8941616610,
        8941633015
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 487537512,
      "nodes": [
        8941632990,
        8941616589,
        8941616591,
        8941616593,
        8941632944,
        8941633087,
        8941633086,
        8941633084,
        8941633085,
        8941633122,
        8941633125,
        8941633119,
        8941632989,
        8941632988,
        8941632986,
        8941616602,
        8941632975
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 487538065,
      "nodes": [
        8941616613,
        8941633100,
        8941633103,
        8941633018,
        8941633101,
        8941633104,
        8941633012,
        8941633011,
        8941632997,
        8941633037,
        8941633072,
        12224070635,
        8941633059,
        8941633060,
        8941633057,
        8941633079,
        8941633082,
        8941633081,
        8941632965,
        8941632964,
        8941632967,
        8941633069,
        8941633071,
        8941633070,
        8941633067,
        8941632922,
        8941632923,
        8941616586,
        8941632972,
        8941633049,
        8941633045,
        8941632925,
        8941616612,
        8941633005,
        8941633004,
        8941633043
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 487538066,
      "nodes": [
        8941632972,
        8941633018
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 487614698,
      "nodes": [
        4260591978,
        4800618692,
        4800618700,
        4799899682,
        4800618688,
        4799899683,
        4800618689,
        3485984691,
        4800618697,
        3485984670,
        4800618695,
        4799899679,
        4800618696,
        4799899689,
        4800618699,
        4800618690,
        4260591978
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 487614700,
      "nodes": [
        4800618693,
        4799899723,
        4800618706,
        4799912248,
        4800618703,
        4799912246,
        4800618701,
        4800618691,
        3477544143,
        4800618705,
        3477543595,
        4800618702,
        4799912247,
        4800618704,
        4799912249,
        4800618698,
        4800618694,
        4799899726,
        4800618693
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 487859003,
      "nodes": [
        8941616615,
        8941632945,
        8941632946,
        8941632994,
        8941633022,
        8941633024,
        8941633026,
        8941632947,
        8941632992,
        8941633025,
        8941633020,
        8941632921,
        8941633097,
        8941633094,
        12771520279,
        1808065296
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 499949472,
      "nodes": [
        390432095,
        5954807896,
        1808065070
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "3"
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
      "id": 613396113,
      "nodes": [
        9163248165,
        3709736099,
        3709736080,
        3709736107,
        3709736131,
        5922766671,
        3709736112,
        3709736057,
        3709736109,
        11900322773,
        4799899747
      ],
      "tags": {
        "highway": "residential",
        "name": "ארגמן",
        "name:en": "Argaman",
        "name:he": "ארגמן",
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
      "id": 632429481,
      "nodes": [
        5971432511,
        5971432512,
        5971432513,
        5971432514,
        5971432515
      ],
      "tags": {
        "highway": "trunk_link",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 632429482,
      "nodes": [
        1808065284,
        5971432519,
        5971432518,
        5971432517,
        5971432516,
        3110168809,
        3110168810
      ],
      "tags": {
        "highway": "trunk_link",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 632429484,
      "nodes": [
        1808065070,
        6013351621,
        4911250755
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 632429485,
      "nodes": [
        1808065070,
        4911250756,
        6379379124,
        4403234149
      ],
      "tags": {
        "highway": "trunk",
        "maxspeed": "90",
        "oneway": "yes",
        "ref": "3"
      }
    },
    {
      "type": "way",
      "id": 632429486,
      "nodes": [
        390432095,
        3110168810,
        5971432563,
        1504450147,
        1504416490,
        1504416496,
        2127283822,
        198653430,
        1146922036,
        1504450314,
        2127283814,
        2127283819,
        1504450226,
        1504450121,
        129595902,
        1504449916
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 632429488,
      "nodes": [
        5971432505,
        390432095
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 632429489,
      "nodes": [
        4911250754,
        5971432520,
        6379379089,
        4911250755
      ],
      "tags": {
        "highway": "trunk",
        "maxspeed": "90",
        "oneway": "yes",
        "ref": "3"
      }
    },
    {
      "type": "way",
      "id": 632429490,
      "nodes": [
        4911250754,
        3110168813,
        3110168818,
        3110168817
      ],
      "tags": {
        "destination": "תל אביב-יפו;אשדוד",
        "destination:ref": "4",
        "highway": "trunk_link",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 632429492,
      "nodes": [
        4911250755,
        3110168817
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 632429493,
      "nodes": [
        4911250755,
        5971432505
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "3"
      }
    },
    {
      "type": "way",
      "id": 632429496,
      "nodes": [
        3110168817,
        5971432541,
        1504450361,
        5357538781,
        411886093,
        2127283855,
        5357534694,
        3176511633,
        12771447472,
        411886114
      ],
      "tags": {
        "highway": "trunk",
        "lanes": "2",
        "oneway": "yes",
        "ref": "4"
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
      "id": 640857051,
      "nodes": [
        2166943879,
        1474519377,
        2051812208,
        2051812202,
        2051812206,
        129595903,
        3176511353,
        5971432542,
        5971432511,
        1504450349,
        5971432505
      ],
      "tags": {
        "highway": "trunk",
        "lanes": "2",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 640857054,
      "nodes": [
        198652795,
        411886114
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
      "id": 640857057,
      "nodes": [
        411886114,
        12771447469,
        939960990,
        3110188132,
        5357538765,
        2051812214,
        1146894003,
        2051812203,
        411886094,
        1146894006,
        14022147522,
        3191818659,
        2051812201,
        5040583316,
        1146894007,
        1146893989,
        1146894018,
        7169205468,
        7169205475,
        7169205480,
        7171772627,
        7169205488,
        7169205489,
        7169205495,
        7169205507,
        7169205510,
        7169205521,
        7169205433
      ],
      "tags": {
        "highway": "trunk",
        "lanes": "2",
        "maxspeed:type": "IL:trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 640857060,
      "nodes": [
        390438965,
        198652795
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 640857062,
      "nodes": [
        390438965,
        12771447467,
        3110188140,
        1808065137,
        2166943873,
        390439011,
        1808065176,
        1345134726,
        390439012,
        5040584301,
        1345134930,
        1808065198,
        1345135017
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
      "id": 681238309,
      "nodes": [
        4403234149,
        6379379152,
        6379379153,
        6379379154,
        6379379156,
        6379379027
      ],
      "tags": {
        "fut_ref": "37",
        "highway": "trunk",
        "lanes": "2",
        "maxspeed": "90",
        "oneway": "yes",
        "ref": "3"
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
      "id": 690191295,
      "nodes": [
        3709736088,
        3709736091,
        3709736108,
        3709736035,
        3709736034,
        3709736032,
        3709736031,
        3709736107,
        6708630392
      ],
      "tags": {
        "highway": "residential",
        "name": "חמרא",
        "name:en": "Hamra",
        "name:he": "חמרא",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507871,
      "nodes": [
        6708630409,
        3709736030,
        6708630475
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507873,
      "nodes": [
        6708630470,
        3709736078,
        6708630390
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507874,
      "nodes": [
        6708630440,
        6708630434,
        6708630431,
        6708630433,
        6708630444,
        6708630429,
        6708630428,
        6708630438
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507875,
      "nodes": [
        3477544314,
        3477543602,
        11180770838,
        3709736137,
        6708630440
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507876,
      "nodes": [
        6708630442,
        3709736135,
        13036870860
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507877,
      "nodes": [
        6708630438,
        11900322557,
        11595797260,
        11595797259,
        11595797270,
        3477544191,
        3477543258
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507879,
      "nodes": [
        6708630415,
        6708630396,
        6708630394,
        6708630397,
        6708630398,
        6708673601,
        6708630389,
        6708673598,
        6708630409
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507882,
      "nodes": [
        6708630403,
        6708630415
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507883,
      "nodes": [
        6708630405,
        11900322665,
        6708630482
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713507885,
      "nodes": [
        6708630404,
        6708630463,
        6708630462,
        6708630461,
        6708673591,
        6708630459,
        6708630456,
        6708630403
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 713512673,
      "nodes": [
        6708696570,
        3477542847
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
      "id": 713512677,
      "nodes": [
        6708696520,
        6708696561,
        6708696569,
        6708696560,
        6708696562,
        6708696566,
        6708696565,
        6708696559,
        6708696564,
        6708709725
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout"
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
      "id": 713512679,
      "nodes": [
        6708709726,
        5931062452,
        3708142533,
        6708696572
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
      "id": 713512681,
      "nodes": [
        6708709711,
        6708696536,
        6708709705,
        6708709686,
        6708696576,
        6708709704,
        6708709701,
        6708709696,
        6708709722,
        6708709720,
        6708709716,
        6708709732,
        6708696531,
        6708709727,
        6708709730,
        6708709728,
        6708709703,
        6708709723,
        6708709715,
        6708696522,
        6708709713,
        6708709724,
        6708709711
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
      "id": 713512684,
      "nodes": [
        6708709722,
        3485984673,
        3708141696,
        6708709729
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
      "id": 713512686,
      "nodes": [
        6708696522,
        3485984670
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
      "id": 713512688,
      "nodes": [
        6708696560,
        3709736084,
        3709736069,
        6708630389
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
      "id": 763373736,
      "nodes": [
        3477543658,
        11180770849,
        3709736094,
        6708630404
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
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
      "id": 763373741,
      "nodes": [
        6708630413,
        3709736022,
        11180770839,
        3477544314
      ],
      "tags": {
        "highway": "tertiary",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
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
      "id": 836378134,
      "nodes": [
        1345134832,
        7806423681,
        390420919
      ],
      "tags": {
        "alt_name:en": "HaTa'asiya",
        "alt_name:he": "התעשייה",
        "highway": "tertiary",
        "name": "התעשיה",
        "name:en": "HaTaasiya",
        "name:he": "התעשיה",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 836378135,
      "nodes": [
        390420919,
        1345135021,
        1345134709
      ],
      "tags": {
        "alt_name:en": "HaTa'asiya",
        "alt_name:he": "התעשייה",
        "highway": "tertiary",
        "name": "התעשיה",
        "name:en": "HaTaasiya",
        "name:he": "התעשיה",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 836378137,
      "nodes": [
        1345134834,
        7806430486,
        7806430485,
        2132379504,
        10160134451,
        10160134454,
        10160134455,
        10160134456,
        10160134457,
        10160134461,
        10160134458,
        12771447489,
        10160134453
      ],
      "tags": {
        "alt_name:en": "HaTa'asiya",
        "alt_name:he": "התעשייה",
        "highway": "tertiary",
        "lanes": "2",
        "name": "התעשיה",
        "name:en": "HaTaasiya",
        "name:he": "התעשיה",
        "oneway": "yes",
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
      "id": 956353223,
      "nodes": [
        4616078646,
        1808065297,
        1808065295,
        1808065266,
        1808065307
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 956353224,
      "nodes": [
        1808113397,
        1808113228,
        4730768489,
        1808113258,
        1808113231,
        1808113251,
        1808113232,
        1808113307,
        1808113235,
        1808113324,
        1808113252,
        1808113236,
        1808113242,
        1808113243,
        1808113254
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 956353228,
      "nodes": [
        12650512597,
        13266000007,
        1808065142,
        1808065115,
        1808065160,
        1808065307
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 956353230,
      "nodes": [
        1808065100,
        4616078646
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 956353231,
      "nodes": [
        1808065118,
        1808065263
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
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
      "id": 963656629,
      "nodes": [
        8594513620,
        1808065303,
        8594513631
      ],
      "tags": {
        "alt_name:en": "Ha'Rakevet",
        "highway": "residential",
        "name": "הרכבת",
        "name:ar": "هَرَكيڤيت",
        "name:en": "HaRakevet",
        "name:he": "הרכבת",
        "name:ru": "ХаРакевет",
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
      "id": 966470929,
      "nodes": [
        8941632978,
        8941632956,
        8941632985,
        8941632971,
        8941633099,
        8941633050,
        8941633053,
        8941633052,
        8941632990,
        8941633131,
        8941633132,
        8941633015,
        8941632940,
        8941632941,
        8941633044,
        8941633043,
        8941633054,
        8941633028,
        8941632978
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 966470930,
      "nodes": [
        8941632956,
        8941633021,
        8941633023,
        8941633090,
        8941633003
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 966470933,
      "nodes": [
        8941633042,
        8941633063,
        8941633083,
        8941616603,
        8941633010,
        8941632961,
        8941632942,
        8941633108,
        8941633035,
        8941633089,
        8941632977,
        8941633074,
        8941633138,
        8941633139,
        8941633109,
        8941633120,
        8941633042
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 966470935,
      "nodes": [
        8941633093,
        8941616601,
        8941633114,
        8941633118,
        8941633016
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 966470937,
      "nodes": [
        8941632942,
        8941616605,
        8941633014,
        8941633105,
        8941633106,
        8941633102,
        8941616614,
        8941616600,
        8941633046
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 966470939,
      "nodes": [
        1808065305,
        12771520278,
        8941616608,
        8941616598,
        8941616599,
        8941632924,
        8941633036,
        8941632958,
        8941632960,
        8941633041,
        8941633039,
        8941633040,
        8941633064
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 966470941,
      "nodes": [
        8941633046,
        8941632981,
        8941633096,
        8941632968,
        12219581402,
        8941616585,
        8941633123,
        8941632948,
        8941633016,
        8941633062,
        8941633061,
        8941633038,
        8941633009,
        8941633055,
        8941633136,
        8941632984,
        8941633019,
        8941632937,
        8941633046
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 966470942,
      "nodes": [
        8941616611,
        8941632921
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 966470947,
      "nodes": [
        8941633075,
        8941633013,
        8941633027,
        8941633137,
        8941633124,
        8941632963,
        8941632918,
        8941632959,
        8941633058,
        8941632917,
        8941632983,
        8941633000,
        8941632995,
        8941632998,
        8941632999,
        8941633003,
        8941632957,
        8941632962,
        8941632955,
        8941633075
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 966470948,
      "nodes": [
        8941632995,
        8941633065,
        8941633091,
        8941633098,
        8941633099
      ],
      "tags": {
        "highway": "residential",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 966470949,
      "nodes": [
        8941633121,
        8941633076,
        8941633064,
        8941633077,
        8941633135,
        8941632919,
        8941633128,
        8941632938,
        8941632982,
        8941632996,
        8941633001,
        14022127970,
        8941633002,
        8941616607,
        8941632953,
        8941632954,
        8941616606,
        8941616590,
        8941616615,
        8941633121
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 1002010718,
      "nodes": [
        11235775791,
        429848981,
        13076482512,
        13233416686,
        1469266429,
        1395072495,
        1395072579,
        13233416692,
        1395072403,
        5399846689,
        681336154
      ],
      "tags": {
        "alt_name:en": "Sh'ar Yeshuv;SheAr Yashoov;Sha'ar Yashuv",
        "highway": "residential",
        "name": "שאר ישוב",
        "name:en": "Shaar Yashuv",
        "name:he": "שאר ישוב"
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
      "id": 1120571852,
      "nodes": [
        3477543974,
        3477543640,
        3477543593,
        3477543258
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1120571853,
      "nodes": [
        3477544099,
        3477543215,
        3477543282,
        3477542844
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
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
      "id": 1120571857,
      "nodes": [
        3485984643,
        390445392
      ],
      "tags": {
        "alt_name:en": "HaTa'asiya",
        "alt_name:he": "התעשייה",
        "highway": "secondary",
        "name": "התעשיה",
        "name:en": "HaTaasiya",
        "name:he": "התעשיה",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1120571858,
      "nodes": [
        2470055556,
        2127251951,
        390445277,
        390445278,
        11157715997,
        11157715991,
        390445279,
        3924172716,
        1345736434,
        390445280,
        390445281,
        1474515623,
        10160134464,
        12771447487,
        390445392
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
      "id": 1120571862,
      "nodes": [
        10160134453,
        3485984929,
        12771447482,
        3477543938
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
      "id": 1120571863,
      "nodes": [
        3477543288,
        3477543266,
        3477543918,
        3477543598,
        3477543960,
        3477543228
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1182288639,
      "nodes": [
        5971432584,
        6379379073,
        6379379079,
        6379379084,
        6379379085,
        4911250754
      ],
      "tags": {
        "fut_ref": "37",
        "highway": "trunk",
        "lanes": "2",
        "maxspeed": "90",
        "oneway": "yes",
        "ref": "3"
      }
    },
    {
      "type": "way",
      "id": 1206570707,
      "nodes": [
        11180689013,
        11180689014,
        11180689015,
        11180689016,
        11180689017
      ],
      "tags": {
        "highway": "residential",
        "name": "דוריף",
        "name:en": "Durif",
        "name:he": "דוריף",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1206570708,
      "nodes": [
        11180689021,
        11180689020,
        11180689019,
        11180689018,
        11180689013
      ],
      "tags": {
        "highway": "residential",
        "name": "דוריף",
        "name:en": "Durif",
        "name:he": "דוריף",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1206570709,
      "nodes": [
        11180689023,
        11180689024,
        11180689025,
        11180689026,
        11180689027,
        11180689022
      ],
      "tags": {
        "highway": "residential",
        "name": "דוריף",
        "name:en": "Durif",
        "name:he": "דוריף",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1206570710,
      "nodes": [
        11180689022,
        11180689028,
        11180689029,
        11180689030,
        11180689031,
        11180689032,
        11180689033
      ],
      "tags": {
        "highway": "residential",
        "name": "דוריף",
        "name:en": "Durif",
        "name:he": "דוריף",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1206571932,
      "nodes": [
        11180761328,
        11180761329,
        11180761330,
        11180761331,
        11180761332,
        11180761333
      ],
      "tags": {
        "highway": "tertiary",
        "lane_markings": "no",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1206571933,
      "nodes": [
        11180761334,
        11180761335,
        11180761336,
        11180770837,
        11180770838
      ],
      "tags": {
        "highway": "tertiary_link",
        "lane_markings": "no",
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
      "id": 1206571934,
      "nodes": [
        11180770839,
        11180770840,
        11180770841,
        11180770842,
        11180770843,
        11180770844
      ],
      "tags": {
        "highway": "tertiary_link",
        "lane_markings": "no",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1206571935,
      "nodes": [
        11180770845,
        11180770846,
        11180770847,
        11180770848,
        11180770849
      ],
      "tags": {
        "highway": "tertiary",
        "lane_markings": "no",
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
      "id": 1212801952,
      "nodes": [
        3477542844,
        3477543635,
        3477543286,
        3477543974
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801953,
      "nodes": [
        6708630436,
        6708630420,
        6708630418,
        6708630416,
        6708630443,
        6708630414,
        6708630410,
        6708630442
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801954,
      "nodes": [
        6708630442,
        6708630408,
        6708630407,
        6708630406,
        6708630440
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801955,
      "nodes": [
        6708630482,
        6708630412,
        6708630411,
        6708630417,
        6708630424,
        6708630469,
        6708630467,
        11236453114,
        6708630413
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801956,
      "nodes": [
        6708630403,
        6708630455,
        6708630453,
        6708630452,
        6708630482
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801957,
      "nodes": [
        6708630390,
        6708630451,
        6708630450,
        6708630449,
        6708630392,
        6708630448,
        6708630447,
        6708630405
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801958,
      "nodes": [
        6708630409,
        6708673595,
        6708673589,
        6708630474,
        6708630390
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801967,
      "nodes": [
        6708696571,
        6708696547,
        6708696545,
        6708696563,
        6708696544,
        6708696550,
        6708696572,
        6708696542,
        6708696541,
        6708696570
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 1212801968,
      "nodes": [
        6708709725,
        6708696555,
        6708696549,
        6708696571
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout"
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
      "id": 1212801974,
      "nodes": [
        6708696570,
        6708696540,
        6708696539,
        6708696520
      ],
      "tags": {
        "highway": "secondary",
        "junction": "roundabout"
      }
    },
    {
      "type": "way",
      "id": 1212801976,
      "nodes": [
        6708630405,
        6708630391,
        6708630393,
        6708630395,
        6708630415
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801977,
      "nodes": [
        6708630413,
        6708630472,
        6708630471,
        6708630465,
        6708630404
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801978,
      "nodes": [
        6708630438,
        6708630427,
        6708630423,
        6708630422,
        6708630436
      ],
      "tags": {
        "highway": "tertiary",
        "junction": "roundabout",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1212801979,
      "nodes": [
        3477543258,
        3477543198,
        3477543288
      ],
      "tags": {
        "highway": "tertiary",
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
      "id": 1247370799,
      "nodes": [
        11595797260,
        11595797261,
        11595797262,
        11595797263,
        3709736095
      ],
      "tags": {
        "highway": "residential",
        "name": "הכורמים",
        "name:en": "HaKormim",
        "name:he": "הכורמים",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1247370800,
      "nodes": [
        3709736095,
        11595797264,
        11595797265,
        11595797266,
        12768228005,
        11595797267,
        11595797268,
        11595797269,
        11595797270
      ],
      "tags": {
        "highway": "residential",
        "name": "הכורמים",
        "name:en": "HaKormim",
        "name:he": "הכורמים",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1247370801,
      "nodes": [
        11595797276,
        11595797275,
        11595797274,
        11595797273,
        11595797272,
        11595797271
      ],
      "tags": {
        "highway": "residential",
        "name": "שאנין",
        "name:en": "Chenin",
        "name:he": "שאנין",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1247370802,
      "nodes": [
        11595797271,
        11595797277,
        11595797278,
        11595797279,
        11595797280,
        11595797281,
        11595797282
      ],
      "tags": {
        "highway": "residential",
        "name": "שאנין",
        "name:en": "Chenin",
        "name:he": "שאנין",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1249530328,
      "nodes": [
        11180761328,
        3477543632,
        3477543658
      ],
      "tags": {
        "highway": "tertiary",
        "lanes": "3",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
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
      "id": 1249530340,
      "nodes": [
        13036866862,
        11180761334,
        3477543602
      ],
      "tags": {
        "highway": "residential",
        "lanes": "3",
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
      "id": 1249530347,
      "nodes": [
        3477543602,
        3477543632,
        11180761333
      ],
      "tags": {
        "highway": "tertiary",
        "lanes": "2",
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
      "id": 1249530348,
      "nodes": [
        3477544314,
        11180770844,
        13036895481
      ],
      "tags": {
        "highway": "residential",
        "lanes": "3",
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
      "id": 1249530349,
      "nodes": [
        11613689450,
        7133171700,
        11613689451,
        11613689452,
        7133171701,
        11613689453
      ],
      "tags": {
        "highway": "residential",
        "name": "המיל השלישי",
        "name:en": "HaMil HaShlishi",
        "name:he": "המיל השלישי",
        "oneway": "yes",
        "surface": "unpaved"
      }
    },
    {
      "type": "way",
      "id": 1309816857,
      "nodes": [
        12127519611,
        12127519610,
        12127519609,
        12127519773,
        12127519608,
        12127519607,
        12127519606,
        12127519786,
        12127516994,
        12127516995,
        12127516996,
        12127516997,
        12127516998,
        12127516999,
        12135247782,
        12127517000,
        12127519601,
        12127519602,
        12127519603,
        12127519612,
        12127519604,
        12127519605,
        12127519943,
        12127516984
      ],
      "tags": {
        "highway": "residential"
      }
    },
    {
      "type": "way",
      "id": 1309816859,
      "nodes": [
        12127519631,
        12127519632,
        12127519633,
        12127519634,
        12127519635,
        12127519636,
        12127519637,
        12127519611,
        12127519638,
        12127520268,
        12127519639,
        12127519640,
        12127519641,
        12127519642
      ],
      "tags": {
        "highway": "residential"
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
      "id": 1365375584,
      "nodes": [
        1808065307,
        1808113211,
        1808065244,
        1808113348
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1365375586,
      "nodes": [
        1808113250,
        13007231054,
        1808113227,
        1808113402,
        4730768488,
        1808113397
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1365375587,
      "nodes": [
        1808065042,
        1808065200,
        1808065108,
        1808065334,
        1808065100
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "lane_markings": "no",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1365375588,
      "nodes": [
        198652794,
        1808065311,
        1345134796,
        1808065114,
        12771447466,
        198652795
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
      "id": 1365375589,
      "nodes": [
        198652795,
        3176511566,
        12771447471,
        5357538728,
        2166943879
      ],
      "tags": {
        "highway": "trunk",
        "lanes": "2",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 1365375593,
      "nodes": [
        1808113254,
        1808113248,
        1808113250
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1365375594,
      "nodes": [
        1808113348,
        1808065240,
        1808065034,
        1808065328
      ],
      "tags": {
        "highway": "residential",
        "junction": "roundabout",
        "oneway": "yes"
      }
    },
    {
      "type": "way",
      "id": 1366048320,
      "nodes": [
        8594513631,
        1808065147,
        12650512597
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
      "id": 1369361133,
      "nodes": [
        1504416385,
        12127519802,
        3176511606,
        5971432564,
        1504450401
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 1369361134,
      "nodes": [
        1504450401,
        1808065070
      ],
      "tags": {
        "highway": "trunk",
        "oneway": "yes",
        "ref": "4"
      }
    },
    {
      "type": "way",
      "id": 1418606004,
      "nodes": [
        13036870860,
        11180761328
      ],
      "tags": {
        "highway": "tertiary",
        "lanes": "4",
        "maxspeed": "50",
        "name": "דרך הים",
        "name:en": "Derekh HaYam",
        "name:he": "דרך הים",
        "oneway": "yes",
        "surface": "asphalt"
      }
    },
    {
      "type": "way",
      "id": 1418606182,
      "nodes": [
        11613689453,
        13036866862
      ],
      "tags": {
        "highway": "residential",
        "lanes": "2",
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
      "id": 1418606539,
      "nodes": [
        13036895481,
        11613689450
      ],
      "tags": {
        "highway": "residential",
        "lanes": "2",
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
      "id": 129595902,
      "lat": 31.670082,
      "lon": 34.6067925
    },
    {
      "type": "node",
      "id": 129595903,
      "lat": 31.6771328,
      "lon": 34.6097019
    },
    {
      "type": "node",
      "id": 129595905,
      "lat": 31.6846401,
      "lon": 34.6099934
    },
    {
      "type": "node",
      "id": 198652794,
      "lat": 31.6802683,
      "lon": 34.6086707
    },
    {
      "type": "node",
      "id": 198652795,
      "lat": 31.680386,
      "lon": 34.609755
    },
    {
      "type": "node",
      "id": 198653430,
      "lat": 31.6737978,
      "lon": 34.6086825
    },
    {
      "type": "node",
      "id": 390420919,
      "lat": 31.6754759,
      "lon": 34.5979611
    },
    {
      "type": "node",
      "id": 390421083,
      "lat": 31.6743982,
      "lon": 34.5980414
    },
    {
      "type": "node",
      "id": 390421084,
      "lat": 31.6730767,
      "lon": 34.5981444
    },
    {
      "type": "node",
      "id": 390430484,
      "lat": 31.6795476,
      "lon": 34.6054741
    },
    {
      "type": "node",
      "id": 390432095,
      "lat": 31.676088,
      "lon": 34.6095188
    },
    {
      "type": "node",
      "id": 390438965,
      "lat": 31.6805118,
      "lon": 34.6097517
    },
    {
      "type": "node",
      "id": 390439011,
      "lat": 31.6804653,
      "lon": 34.6089184
    },
    {
      "type": "node",
      "id": 390439012,
      "lat": 31.6801874,
      "lon": 34.6080318
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
      "id": 390440023,
      "lat": 31.6785857,
      "lon": 34.5952352
    },
    {
      "type": "node",
      "id": 390440024,
      "lat": 31.6781778,
      "lon": 34.5944836
    },
    {
      "type": "node",
      "id": 390440025,
      "lat": 31.6777995,
      "lon": 34.5939127
    },
    {
      "type": "node",
      "id": 390440026,
      "lat": 31.6757627,
      "lon": 34.5913109
    },
    {
      "type": "node",
      "id": 390440027,
      "lat": 31.6754107,
      "lon": 34.5908013
    },
    {
      "type": "node",
      "id": 390440028,
      "lat": 31.6749773,
      "lon": 34.5901369
    },
    {
      "type": "node",
      "id": 390440029,
      "lat": 31.674727,
      "lon": 34.589671
    },
    {
      "type": "node",
      "id": 390440030,
      "lat": 31.6745434,
      "lon": 34.5892307
    },
    {
      "type": "node",
      "id": 390445260,
      "lat": 31.6787903,
      "lon": 34.5961594
    },
    {
      "type": "node",
      "id": 390445277,
      "lat": 31.6747697,
      "lon": 34.5900522
    },
    {
      "type": "node",
      "id": 390445278,
      "lat": 31.6752982,
      "lon": 34.5909226
    },
    {
      "type": "node",
      "id": 390445279,
      "lat": 31.6768079,
      "lon": 34.5928943
    },
    {
      "type": "node",
      "id": 390445280,
      "lat": 31.677982,
      "lon": 34.5944447
    },
    {
      "type": "node",
      "id": 390445281,
      "lat": 31.6783261,
      "lon": 34.5950717
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
      "id": 411886093,
      "lat": 31.6772336,
      "lon": 34.6098998
    },
    {
      "type": "node",
      "id": 411886094,
      "lat": 31.6840786,
      "lon": 34.6100004
    },
    {
      "type": "node",
      "id": 411886114,
      "lat": 31.6804506,
      "lon": 34.6099558
    },
    {
      "type": "node",
      "id": 429848981,
      "lat": 31.6812613,
      "lon": 34.5868429
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
      "id": 681336146,
      "lat": 31.6774091,
      "lon": 34.5886959
    },
    {
      "type": "node",
      "id": 681336150,
      "lat": 31.679184,
      "lon": 34.5893199
    },
    {
      "type": "node",
      "id": 681336154,
      "lat": 31.6806609,
      "lon": 34.5894943
    },
    {
      "type": "node",
      "id": 939960990,
      "lat": 31.6810212,
      "lon": 34.6099558
    },
    {
      "type": "node",
      "id": 1112219120,
      "lat": 31.6764463,
      "lon": 34.6051663
    },
    {
      "type": "node",
      "id": 1146893989,
      "lat": 31.6909155,
      "lon": 34.6133694
    },
    {
      "type": "node",
      "id": 1146893994,
      "lat": 31.6850676,
      "lon": 34.6101822
    },
    {
      "type": "node",
      "id": 1146893997,
      "lat": 31.6834621,
      "lon": 34.609744
    },
    {
      "type": "node",
      "id": 1146894003,
      "lat": 31.6830764,
      "lon": 34.6099333
    },
    {
      "type": "node",
      "id": 1146894006,
      "lat": 31.6848797,
      "lon": 34.6102696
    },
    {
      "type": "node",
      "id": 1146894007,
      "lat": 31.6894058,
      "lon": 34.6126281
    },
    {
      "type": "node",
      "id": 1146894012,
      "lat": 31.6910223,
      "lon": 34.6132047
    },
    {
      "type": "node",
      "id": 1146894017,
      "lat": 31.6926795,
      "lon": 34.6138147
    },
    {
      "type": "node",
      "id": 1146894018,
      "lat": 31.6926509,
      "lon": 34.6140381
    },
    {
      "type": "node",
      "id": 1146894023,
      "lat": 31.6895651,
      "lon": 34.61251
    },
    {
      "type": "node",
      "id": 1146922036,
      "lat": 31.6732138,
      "lon": 34.6083808
    },
    {
      "type": "node",
      "id": 1344792948,
      "lat": 31.6789207,
      "lon": 34.5961042
    },
    {
      "type": "node",
      "id": 1345134694,
      "lat": 31.6763401,
      "lon": 34.5978141
    },
    {
      "type": "node",
      "id": 1345134704,
      "lat": 31.6762404,
      "lon": 34.597502
    },
    {
      "type": "node",
      "id": 1345134709,
      "lat": 31.6761049,
      "lon": 34.5978272
    },
    {
      "type": "node",
      "id": 1345134713,
      "lat": 31.676057,
      "lon": 34.5977177
    },
    {
      "type": "node",
      "id": 1345134726,
      "lat": 31.6803397,
      "lon": 34.6084618
    },
    {
      "type": "node",
      "id": 1345134735,
      "lat": 31.6761452,
      "lon": 34.5978606
    },
    {
      "type": "node",
      "id": 1345134745,
      "lat": 31.6799149,
      "lon": 34.6077915
    },
    {
      "type": "node",
      "id": 1345134788,
      "lat": 31.6761096,
      "lon": 34.5975482
    },
    {
      "type": "node",
      "id": 1345134796,
      "lat": 31.6803625,
      "lon": 34.6091165
    },
    {
      "type": "node",
      "id": 1345134832,
      "lat": 31.6760581,
      "lon": 34.5976553
    },
    {
      "type": "node",
      "id": 1345134834,
      "lat": 31.6763625,
      "lon": 34.5977741
    },
    {
      "type": "node",
      "id": 1345134836,
      "lat": 31.6761922,
      "lon": 34.5978782
    },
    {
      "type": "node",
      "id": 1345134863,
      "lat": 31.6762416,
      "lon": 34.5978783
    },
    {
      "type": "node",
      "id": 1345134930,
      "lat": 31.6799137,
      "lon": 34.6073745
    },
    {
      "type": "node",
      "id": 1345134952,
      "lat": 31.6761537,
      "lon": 34.5975153
    },
    {
      "type": "node",
      "id": 1345134969,
      "lat": 31.6763071,
      "lon": 34.5975321
    },
    {
      "type": "node",
      "id": 1345134984,
      "lat": 31.6763784,
      "lon": 34.5976727
    },
    {
      "type": "node",
      "id": 1345134987,
      "lat": 31.6762752,
      "lon": 34.5975127
    },
    {
      "type": "node",
      "id": 1345135017,
      "lat": 31.679803,
      "lon": 34.6069758
    },
    {
      "type": "node",
      "id": 1345135021,
      "lat": 31.6758478,
      "lon": 34.597894
    },
    {
      "type": "node",
      "id": 1345135036,
      "lat": 31.6797659,
      "lon": 34.6074431
    },
    {
      "type": "node",
      "id": 1345135060,
      "lat": 31.6760763,
      "lon": 34.5975967
    },
    {
      "type": "node",
      "id": 1345135064,
      "lat": 31.6763099,
      "lon": 34.5978462
    },
    {
      "type": "node",
      "id": 1345135106,
      "lat": 31.6764857,
      "lon": 34.597498
    },
    {
      "type": "node",
      "id": 1345736426,
      "lat": 31.6768627,
      "lon": 34.592717
    },
    {
      "type": "node",
      "id": 1345736434,
      "lat": 31.6774641,
      "lon": 34.5937378
    },
    {
      "type": "node",
      "id": 1395071918,
      "lat": 31.6769419,
      "lon": 34.5885638
    },
    {
      "type": "node",
      "id": 1395072053,
      "lat": 31.6805843,
      "lon": 34.5895318
    },
    {
      "type": "node",
      "id": 1395072057,
      "lat": 31.6799064,
      "lon": 34.5894504
    },
    {
      "type": "node",
      "id": 1395072173,
      "lat": 31.6801233,
      "lon": 34.589488
    },
    {
      "type": "node",
      "id": 1395072235,
      "lat": 31.6779142,
      "lon": 34.5888879
    },
    {
      "type": "node",
      "id": 1395072403,
      "lat": 31.6808015,
      "lon": 34.5892906
    },
    {
      "type": "node",
      "id": 1395072405,
      "lat": 31.680505,
      "lon": 34.5895458
    },
    {
      "type": "node",
      "id": 1395072495,
      "lat": 31.680976,
      "lon": 34.5886297
    },
    {
      "type": "node",
      "id": 1395072497,
      "lat": 31.6762932,
      "lon": 34.5883201
    },
    {
      "type": "node",
      "id": 1395072537,
      "lat": 31.6788046,
      "lon": 34.5891892
    },
    {
      "type": "node",
      "id": 1395072579,
      "lat": 31.6808852,
      "lon": 34.5890575
    },
    {
      "type": "node",
      "id": 1469266429,
      "lat": 31.6810823,
      "lon": 34.5880379
    },
    {
      "type": "node",
      "id": 1469266459,
      "lat": 31.6800938,
      "lon": 34.5885165
    },
    {
      "type": "node",
      "id": 1469266613,
      "lat": 31.6783418,
      "lon": 34.5890349
    },
    {
      "type": "node",
      "id": 1474515605,
      "lat": 31.678542,
      "lon": 34.5957808
    },
    {
      "type": "node",
      "id": 1474515609,
      "lat": 31.6790159,
      "lon": 34.5969465
    },
    {
      "type": "node",
      "id": 1474515623,
      "lat": 31.6784495,
      "lon": 34.5953294
    },
    {
      "type": "node",
      "id": 1474515626,
      "lat": 31.6787915,
      "lon": 34.5962827
    },
    {
      "type": "node",
      "id": 1474515627,
      "lat": 31.6785769,
      "lon": 34.5961378
    },
    {
      "type": "node",
      "id": 1474515635,
      "lat": 31.6787344,
      "lon": 34.5962048
    },
    {
      "type": "node",
      "id": 1474515663,
      "lat": 31.6786686,
      "lon": 34.596148
    },
    {
      "type": "node",
      "id": 1474515671,
      "lat": 31.6785332,
      "lon": 34.5956722
    },
    {
      "type": "node",
      "id": 1474515677,
      "lat": 31.6785311,
      "lon": 34.5958964
    },
    {
      "type": "node",
      "id": 1474515685,
      "lat": 31.6785177,
      "lon": 34.5955586
    },
    {
      "type": "node",
      "id": 1474519347,
      "lat": 31.6816416,
      "lon": 34.609748
    },
    {
      "type": "node",
      "id": 1474519360,
      "lat": 31.6800516,
      "lon": 34.6081321
    },
    {
      "type": "node",
      "id": 1474519377,
      "lat": 31.6795753,
      "lon": 34.6097461
    },
    {
      "type": "node",
      "id": 1504416385,
      "lat": 31.6746124,
      "lon": 34.609261
    },
    {
      "type": "node",
      "id": 1504416490,
      "lat": 31.6752375,
      "lon": 34.6092951
    },
    {
      "type": "node",
      "id": 1504416496,
      "lat": 31.6742475,
      "lon": 34.6089072
    },
    {
      "type": "node",
      "id": 1504449916,
      "lat": 31.6696952,
      "lon": 34.6067076
    },
    {
      "type": "node",
      "id": 1504450121,
      "lat": 31.6705888,
      "lon": 34.6069438
    },
    {
      "type": "node",
      "id": 1504450147,
      "lat": 31.675529,
      "lon": 34.6093814
    },
    {
      "type": "node",
      "id": 1504450226,
      "lat": 31.6709819,
      "lon": 34.6071093
    },
    {
      "type": "node",
      "id": 1504450314,
      "lat": 31.6725086,
      "lon": 34.6079656
    },
    {
      "type": "node",
      "id": 1504450349,
      "lat": 31.6763778,
      "lon": 34.6095818
    },
    {
      "type": "node",
      "id": 1504450361,
      "lat": 31.6767823,
      "lon": 34.6098372
    },
    {
      "type": "node",
      "id": 1504450401,
      "lat": 31.6757089,
      "lon": 34.6096011
    },
    {
      "type": "node",
      "id": 1560915497,
      "lat": 31.6791234,
      "lon": 34.5967773
    },
    {
      "type": "node",
      "id": 1617058815,
      "lat": 31.6787271,
      "lon": 34.5955911
    },
    {
      "type": "node",
      "id": 1808065027,
      "lat": 31.6799376,
      "lon": 34.6062154
    },
    {
      "type": "node",
      "id": 1808065030,
      "lat": 31.6798554,
      "lon": 34.6065829
    },
    {
      "type": "node",
      "id": 1808065032,
      "lat": 31.6812888,
      "lon": 34.6059284
    },
    {
      "type": "node",
      "id": 1808065034,
      "lat": 31.6773499,
      "lon": 34.6063184
    },
    {
      "type": "node",
      "id": 1808065036,
      "lat": 31.67789,
      "lon": 34.605079
    },
    {
      "type": "node",
      "id": 1808065038,
      "lat": 31.6781269,
      "lon": 34.6063088
    },
    {
      "type": "node",
      "id": 1808065040,
      "lat": 31.6777888,
      "lon": 34.605242
    },
    {
      "type": "node",
      "id": 1808065042,
      "lat": 31.6777572,
      "lon": 34.6064232
    },
    {
      "type": "node",
      "id": 1808065044,
      "lat": 31.6797069,
      "lon": 34.605506
    },
    {
      "type": "node",
      "id": 1808065046,
      "lat": 31.6803256,
      "lon": 34.6060035
    },
    {
      "type": "node",
      "id": 1808065048,
      "lat": 31.6795336,
      "lon": 34.6058426
    },
    {
      "type": "node",
      "id": 1808065050,
      "lat": 31.6797848,
      "lon": 34.6057849
    },
    {
      "type": "node",
      "id": 1808065052,
      "lat": 31.6819177,
      "lon": 34.6057819
    },
    {
      "type": "node",
      "id": 1808065054,
      "lat": 31.6799787,
      "lon": 34.6061886
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
      "id": 1808065062,
      "lat": 31.6798256,
      "lon": 34.6059241
    },
    {
      "type": "node",
      "id": 1808065066,
      "lat": 31.6800357,
      "lon": 34.606025
    },
    {
      "type": "node",
      "id": 1808065068,
      "lat": 31.6816333,
      "lon": 34.6055931
    },
    {
      "type": "node",
      "id": 1808065070,
      "lat": 31.6760591,
      "lon": 34.6096831
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
      "id": 1808065078,
      "lat": 31.6798761,
      "lon": 34.6059936
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
      "id": 1808065086,
      "lat": 31.6819508,
      "lon": 34.6058446
    },
    {
      "type": "node",
      "id": 1808065088,
      "lat": 31.6794012,
      "lon": 34.606224
    },
    {
      "type": "node",
      "id": 1808065090,
      "lat": 31.6809328,
      "lon": 34.6046276
    },
    {
      "type": "node",
      "id": 1808065092,
      "lat": 31.6794925,
      "lon": 34.6059472
    },
    {
      "type": "node",
      "id": 1808065096,
      "lat": 31.6796629,
      "lon": 34.6070457
    },
    {
      "type": "node",
      "id": 1808065098,
      "lat": 31.6816403,
      "lon": 34.6055071
    },
    {
      "type": "node",
      "id": 1808065100,
      "lat": 31.6777539,
      "lon": 34.6060974
    },
    {
      "type": "node",
      "id": 1808065102,
      "lat": 31.6784,
      "lon": 34.6062868
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
      "id": 1808065106,
      "lat": 31.6799491,
      "lon": 34.6060202
    },
    {
      "type": "node",
      "id": 1808065107,
      "lat": 31.6819353,
      "lon": 34.6061093
    },
    {
      "type": "node",
      "id": 1808065108,
      "lat": 31.6778024,
      "lon": 34.6062596
    },
    {
      "type": "node",
      "id": 1808065109,
      "lat": 31.6796115,
      "lon": 34.6066703
    },
    {
      "type": "node",
      "id": 1808065110,
      "lat": 31.6819689,
      "lon": 34.6059152
    },
    {
      "type": "node",
      "id": 1808065111,
      "lat": 31.6815187,
      "lon": 34.6060829
    },
    {
      "type": "node",
      "id": 1808065112,
      "lat": 31.6818248,
      "lon": 34.6062189
    },
    {
      "type": "node",
      "id": 1808065113,
      "lat": 31.6815001,
      "lon": 34.6058998
    },
    {
      "type": "node",
      "id": 1808065114,
      "lat": 31.6803751,
      "lon": 34.6093928
    },
    {
      "type": "node",
      "id": 1808065115,
      "lat": 31.677541,
      "lon": 34.6057963
    },
    {
      "type": "node",
      "id": 1808065116,
      "lat": 31.6785537,
      "lon": 34.6047343
    },
    {
      "type": "node",
      "id": 1808065117,
      "lat": 31.6816838,
      "lon": 34.6062343
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
      "id": 1808065123,
      "lat": 31.6801761,
      "lon": 34.6084127
    },
    {
      "type": "node",
      "id": 1808065137,
      "lat": 31.6804836,
      "lon": 34.6091601
    },
    {
      "type": "node",
      "id": 1808065140,
      "lat": 31.681565,
      "lon": 34.6061589
    },
    {
      "type": "node",
      "id": 1808065142,
      "lat": 31.677565,
      "lon": 34.6056479
    },
    {
      "type": "node",
      "id": 1808065143,
      "lat": 31.6817214,
      "lon": 34.6056798
    },
    {
      "type": "node",
      "id": 1808065144,
      "lat": 31.6780388,
      "lon": 34.6063162
    },
    {
      "type": "node",
      "id": 1808065145,
      "lat": 31.6778627,
      "lon": 34.6061515
    },
    {
      "type": "node",
      "id": 1808065146,
      "lat": 31.6795148,
      "lon": 34.6063884
    },
    {
      "type": "node",
      "id": 1808065147,
      "lat": 31.67766,
      "lon": 34.6052939
    },
    {
      "type": "node",
      "id": 1808065148,
      "lat": 31.6817949,
      "lon": 34.6056889
    },
    {
      "type": "node",
      "id": 1808065149,
      "lat": 31.6798759,
      "lon": 34.6063093
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
      "id": 1808065153,
      "lat": 31.6794946,
      "lon": 34.606329
    },
    {
      "type": "node",
      "id": 1808065155,
      "lat": 31.6793464,
      "lon": 34.6045712
    },
    {
      "type": "node",
      "id": 1808065157,
      "lat": 31.6819588,
      "lon": 34.6060515
    },
    {
      "type": "node",
      "id": 1808065158,
      "lat": 31.6816472,
      "lon": 34.605046
    },
    {
      "type": "node",
      "id": 1808065160,
      "lat": 31.6775269,
      "lon": 34.6059188
    },
    {
      "type": "node",
      "id": 1808065162,
      "lat": 31.6775614,
      "lon": 34.6065312
    },
    {
      "type": "node",
      "id": 1808065176,
      "lat": 31.6804187,
      "lon": 34.608695
    },
    {
      "type": "node",
      "id": 1808065178,
      "lat": 31.6805767,
      "lon": 34.6045095
    },
    {
      "type": "node",
      "id": 1808065181,
      "lat": 31.6774245,
      "lon": 34.6064665
    },
    {
      "type": "node",
      "id": 1808065183,
      "lat": 31.6802297,
      "lon": 34.6061618
    },
    {
      "type": "node",
      "id": 1808065184,
      "lat": 31.6778834,
      "lon": 34.6063522
    },
    {
      "type": "node",
      "id": 1808065185,
      "lat": 31.6819012,
      "lon": 34.6061592
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
      "id": 1808065193,
      "lat": 31.6814851,
      "lon": 34.6058667
    },
    {
      "type": "node",
      "id": 1808065195,
      "lat": 31.681789,
      "lon": 34.6062326
    },
    {
      "type": "node",
      "id": 1808065198,
      "lat": 31.679843,
      "lon": 34.6071848
    },
    {
      "type": "node",
      "id": 1808065200,
      "lat": 31.6777913,
      "lon": 34.6063458
    },
    {
      "type": "node",
      "id": 1808065209,
      "lat": 31.681508,
      "lon": 34.6061189
    },
    {
      "type": "node",
      "id": 1808065226,
      "lat": 31.6781444,
      "lon": 34.6061462
    },
    {
      "type": "node",
      "id": 1808065228,
      "lat": 31.6800449,
      "lon": 34.6061725
    },
    {
      "type": "node",
      "id": 1808065230,
      "lat": 31.6792912,
      "lon": 34.606204
    },
    {
      "type": "node",
      "id": 1808065232,
      "lat": 31.681403,
      "lon": 34.6047295
    },
    {
      "type": "node",
      "id": 1808065236,
      "lat": 31.6816198,
      "lon": 34.6062067
    },
    {
      "type": "node",
      "id": 1808065240,
      "lat": 31.6773465,
      "lon": 34.6062319
    },
    {
      "type": "node",
      "id": 1808065242,
      "lat": 31.6818549,
      "lon": 34.6056949
    },
    {
      "type": "node",
      "id": 1808065244,
      "lat": 31.6773855,
      "lon": 34.6061102
    },
    {
      "type": "node",
      "id": 1808065246,
      "lat": 31.6814962,
      "lon": 34.6059932
    },
    {
      "type": "node",
      "id": 1808065248,
      "lat": 31.6814121,
      "lon": 34.6059097
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
      "id": 1808065260,
      "lat": 31.681387,
      "lon": 34.6060894
    },
    {
      "type": "node",
      "id": 1808065263,
      "lat": 31.6815298,
      "lon": 34.6058131
    },
    {
      "type": "node",
      "id": 1808065266,
      "lat": 31.6775018,
      "lon": 34.6060077
    },
    {
      "type": "node",
      "id": 1808065269,
      "lat": 31.681649,
      "lon": 34.6056974
    },
    {
      "type": "node",
      "id": 1808065284,
      "lat": 31.676057,
      "lon": 34.6090662
    },
    {
      "type": "node",
      "id": 1808065286,
      "lat": 31.6794286,
      "lon": 34.606025
    },
    {
      "type": "node",
      "id": 1808065288,
      "lat": 31.6814637,
      "lon": 34.6060958
    },
    {
      "type": "node",
      "id": 1808065289,
      "lat": 31.6807251,
      "lon": 34.6061403
    },
    {
      "type": "node",
      "id": 1808065290,
      "lat": 31.6817659,
      "lon": 34.6054993
    },
    {
      "type": "node",
      "id": 1808065292,
      "lat": 31.6818625,
      "lon": 34.6057241
    },
    {
      "type": "node",
      "id": 1808065293,
      "lat": 31.6817065,
      "lon": 34.6052042
    },
    {
      "type": "node",
      "id": 1808065294,
      "lat": 31.6779556,
      "lon": 34.6063226
    },
    {
      "type": "node",
      "id": 1808065295,
      "lat": 31.6775707,
      "lon": 34.6059941
    },
    {
      "type": "node",
      "id": 1808065296,
      "lat": 31.6776357,
      "lon": 34.6065215
    },
    {
      "type": "node",
      "id": 1808065297,
      "lat": 31.6776399,
      "lon": 34.6060056
    },
    {
      "type": "node",
      "id": 1808065298,
      "lat": 31.679188,
      "lon": 34.6060769
    },
    {
      "type": "node",
      "id": 1808065299,
      "lat": 31.6796913,
      "lon": 34.6072198
    },
    {
      "type": "node",
      "id": 1808065303,
      "lat": 31.6777584,
      "lon": 34.6050903
    },
    {
      "type": "node",
      "id": 1808065305,
      "lat": 31.6774884,
      "lon": 34.6065122
    },
    {
      "type": "node",
      "id": 1808065307,
      "lat": 31.6774396,
      "lon": 34.6060452
    },
    {
      "type": "node",
      "id": 1808065311,
      "lat": 31.6803324,
      "lon": 34.608899
    },
    {
      "type": "node",
      "id": 1808065324,
      "lat": 31.6779305,
      "lon": 34.6048974
    },
    {
      "type": "node",
      "id": 1808065326,
      "lat": 31.6793715,
      "lon": 34.6060545
    },
    {
      "type": "node",
      "id": 1808065328,
      "lat": 31.6773765,
      "lon": 34.6063991
    },
    {
      "type": "node",
      "id": 1808065329,
      "lat": 31.6781164,
      "lon": 34.6047329
    },
    {
      "type": "node",
      "id": 1808065330,
      "lat": 31.6795601,
      "lon": 34.6065075
    },
    {
      "type": "node",
      "id": 1808065331,
      "lat": 31.6776618,
      "lon": 34.6058077
    },
    {
      "type": "node",
      "id": 1808065332,
      "lat": 31.6777072,
      "lon": 34.6054449
    },
    {
      "type": "node",
      "id": 1808065333,
      "lat": 31.6783368,
      "lon": 34.6046536
    },
    {
      "type": "node",
      "id": 1808065334,
      "lat": 31.6777895,
      "lon": 34.6061738
    },
    {
      "type": "node",
      "id": 1808065335,
      "lat": 31.6799033,
      "lon": 34.6062557
    },
    {
      "type": "node",
      "id": 1808065336,
      "lat": 31.6815194,
      "lon": 34.6050782
    },
    {
      "type": "node",
      "id": 1808065337,
      "lat": 31.6780081,
      "lon": 34.6061534
    },
    {
      "type": "node",
      "id": 1808065338,
      "lat": 31.6776641,
      "lon": 34.6056625
    },
    {
      "type": "node",
      "id": 1808113211,
      "lat": 31.6774095,
      "lon": 34.6060758
    },
    {
      "type": "node",
      "id": 1808113227,
      "lat": 31.6765691,
      "lon": 34.6063174
    },
    {
      "type": "node",
      "id": 1808113228,
      "lat": 31.6765251,
      "lon": 34.6061736
    },
    {
      "type": "node",
      "id": 1808113231,
      "lat": 31.6764284,
      "lon": 34.6061554
    },
    {
      "type": "node",
      "id": 1808113232,
      "lat": 31.6763806,
      "lon": 34.6061893
    },
    {
      "type": "node",
      "id": 1808113235,
      "lat": 31.6763517,
      "lon": 34.6062495
    },
    {
      "type": "node",
      "id": 1808113236,
      "lat": 31.6763752,
      "lon": 34.6063677
    },
    {
      "type": "node",
      "id": 1808113242,
      "lat": 31.6764042,
      "lon": 34.6063961
    },
    {
      "type": "node",
      "id": 1808113243,
      "lat": 31.6764396,
      "lon": 34.6064117
    },
    {
      "type": "node",
      "id": 1808113248,
      "lat": 31.6765077,
      "lon": 34.6064019
    },
    {
      "type": "node",
      "id": 1808113250,
      "lat": 31.6765344,
      "lon": 34.6063818
    },
    {
      "type": "node",
      "id": 1808113251,
      "lat": 31.6764027,
      "lon": 34.6061688
    },
    {
      "type": "node",
      "id": 1808113252,
      "lat": 31.6763558,
      "lon": 34.6063295
    },
    {
      "type": "node",
      "id": 1808113254,
      "lat": 31.6764774,
      "lon": 34.6064126
    },
    {
      "type": "node",
      "id": 1808113258,
      "lat": 31.6764562,
      "lon": 34.6061499
    },
    {
      "type": "node",
      "id": 1808113305,
      "lat": 31.6766882,
      "lon": 34.6062647
    },
    {
      "type": "node",
      "id": 1808113307,
      "lat": 31.6763635,
      "lon": 34.6062156
    },
    {
      "type": "node",
      "id": 1808113316,
      "lat": 31.6764505,
      "lon": 34.6054302
    },
    {
      "type": "node",
      "id": 1808113324,
      "lat": 31.6763483,
      "lon": 34.606286
    },
    {
      "type": "node",
      "id": 1808113338,
      "lat": 31.6771699,
      "lon": 34.6063577
    },
    {
      "type": "node",
      "id": 1808113339,
      "lat": 31.6772765,
      "lon": 34.6063628
    },
    {
      "type": "node",
      "id": 1808113343,
      "lat": 31.676787,
      "lon": 34.60637
    },
    {
      "type": "node",
      "id": 1808113344,
      "lat": 31.6771588,
      "lon": 34.6062496
    },
    {
      "type": "node",
      "id": 1808113346,
      "lat": 31.6772528,
      "lon": 34.6062215
    },
    {
      "type": "node",
      "id": 1808113348,
      "lat": 31.6773667,
      "lon": 34.6061487
    },
    {
      "type": "node",
      "id": 1808113349,
      "lat": 31.6770314,
      "lon": 34.606255
    },
    {
      "type": "node",
      "id": 1808113397,
      "lat": 31.6765512,
      "lon": 34.6062034
    },
    {
      "type": "node",
      "id": 1808113402,
      "lat": 31.6765731,
      "lon": 34.6062778
    },
    {
      "type": "node",
      "id": 2051812201,
      "lat": 31.6871624,
      "lon": 34.611423
    },
    {
      "type": "node",
      "id": 2051812202,
      "lat": 31.6781012,
      "lon": 34.6097437
    },
    {
      "type": "node",
      "id": 2051812203,
      "lat": 31.6835117,
      "lon": 34.6099425
    },
    {
      "type": "node",
      "id": 2051812204,
      "lat": 31.6843598,
      "lon": 34.6099044
    },
    {
      "type": "node",
      "id": 2051812205,
      "lat": 31.6856715,
      "lon": 34.6104679
    },
    {
      "type": "node",
      "id": 2051812206,
      "lat": 31.6775826,
      "lon": 34.6097366
    },
    {
      "type": "node",
      "id": 2051812207,
      "lat": 31.687261,
      "lon": 34.6112637
    },
    {
      "type": "node",
      "id": 2051812208,
      "lat": 31.6788791,
      "lon": 34.6097491
    },
    {
      "type": "node",
      "id": 2051812210,
      "lat": 31.6866333,
      "lon": 34.6109005
    },
    {
      "type": "node",
      "id": 2051812211,
      "lat": 31.682714,
      "lon": 34.6097123
    },
    {
      "type": "node",
      "id": 2051812212,
      "lat": 31.6861627,
      "lon": 34.610683
    },
    {
      "type": "node",
      "id": 2051812213,
      "lat": 31.6839739,
      "lon": 34.6098116
    },
    {
      "type": "node",
      "id": 2051812214,
      "lat": 31.6826861,
      "lon": 34.6099304
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
      "id": 2127251951,
      "lat": 31.6746198,
      "lon": 34.589735
    },
    {
      "type": "node",
      "id": 2127251966,
      "lat": 31.6748119,
      "lon": 34.5898476
    },
    {
      "type": "node",
      "id": 2127251969,
      "lat": 31.6783841,
      "lon": 34.5948214
    },
    {
      "type": "node",
      "id": 2127283814,
      "lat": 31.6720204,
      "lon": 34.6076755
    },
    {
      "type": "node",
      "id": 2127283819,
      "lat": 31.6714473,
      "lon": 34.6073394
    },
    {
      "type": "node",
      "id": 2127283822,
      "lat": 31.6741697,
      "lon": 34.6088683
    },
    {
      "type": "node",
      "id": 2127283855,
      "lat": 31.677724,
      "lon": 34.6099271
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
      "id": 2132379488,
      "lat": 31.6757724,
      "lon": 34.5984015
    },
    {
      "type": "node",
      "id": 2132379496,
      "lat": 31.6758888,
      "lon": 34.5983237
    },
    {
      "type": "node",
      "id": 2132379501,
      "lat": 31.6757267,
      "lon": 34.5984793
    },
    {
      "type": "node",
      "id": 2132379504,
      "lat": 31.6768357,
      "lon": 34.5974864
    },
    {
      "type": "node",
      "id": 2132379508,
      "lat": 31.6758203,
      "lon": 34.5983425
    },
    {
      "type": "node",
      "id": 2132379511,
      "lat": 31.6760143,
      "lon": 34.598305
    },
    {
      "type": "node",
      "id": 2132379514,
      "lat": 31.6751653,
      "lon": 34.5979854
    },
    {
      "type": "node",
      "id": 2132379518,
      "lat": 31.6762426,
      "lon": 34.5980716
    },
    {
      "type": "node",
      "id": 2132379520,
      "lat": 31.6762563,
      "lon": 34.5979804
    },
    {
      "type": "node",
      "id": 2132379521,
      "lat": 31.6761216,
      "lon": 34.5982701
    },
    {
      "type": "node",
      "id": 2132379546,
      "lat": 31.6762015,
      "lon": 34.5981869
    },
    {
      "type": "node",
      "id": 2166943826,
      "lat": 31.6806569,
      "lon": 34.6095406
    },
    {
      "type": "node",
      "id": 2166943840,
      "lat": 31.6802689,
      "lon": 34.609605
    },
    {
      "type": "node",
      "id": 2166943856,
      "lat": 31.6803054,
      "lon": 34.6095245
    },
    {
      "type": "node",
      "id": 2166943859,
      "lat": 31.6807226,
      "lon": 34.6096227
    },
    {
      "type": "node",
      "id": 2166943862,
      "lat": 31.6813168,
      "lon": 34.6097491
    },
    {
      "type": "node",
      "id": 2166943863,
      "lat": 31.6805838,
      "lon": 34.6093743
    },
    {
      "type": "node",
      "id": 2166943866,
      "lat": 31.6808121,
      "lon": 34.6096747
    },
    {
      "type": "node",
      "id": 2166943873,
      "lat": 31.6804725,
      "lon": 34.6090136
    },
    {
      "type": "node",
      "id": 2166943875,
      "lat": 31.6801639,
      "lon": 34.6096962
    },
    {
      "type": "node",
      "id": 2166943877,
      "lat": 31.6803145,
      "lon": 34.6093636
    },
    {
      "type": "node",
      "id": 2166943879,
      "lat": 31.6799563,
      "lon": 34.6097503
    },
    {
      "type": "node",
      "id": 2247744399,
      "lat": 31.6790026,
      "lon": 34.5963627
    },
    {
      "type": "node",
      "id": 2247744412,
      "lat": 31.6789874,
      "lon": 34.5961354
    },
    {
      "type": "node",
      "id": 2247744425,
      "lat": 31.6788018,
      "lon": 34.5955553
    },
    {
      "type": "node",
      "id": 2247744452,
      "lat": 31.6788814,
      "lon": 34.5956037
    },
    {
      "type": "node",
      "id": 2247744481,
      "lat": 31.6790097,
      "lon": 34.5959238
    },
    {
      "type": "node",
      "id": 2470055556,
      "lat": 31.6745635,
      "lon": 34.5896016
    },
    {
      "type": "node",
      "id": 3110168809,
      "lat": 31.6759052,
      "lon": 34.6093891
    },
    {
      "type": "node",
      "id": 3110168810,
      "lat": 31.6757185,
      "lon": 34.609436
    },
    {
      "type": "node",
      "id": 3110168813,
      "lat": 31.6761934,
      "lon": 34.6098949
    },
    {
      "type": "node",
      "id": 3110168817,
      "lat": 31.6764107,
      "lon": 34.6097584
    },
    {
      "type": "node",
      "id": 3110168818,
      "lat": 31.6762724,
      "lon": 34.6098231
    },
    {
      "type": "node",
      "id": 3110168819,
      "lat": 31.675891,
      "lon": 34.6097788
    },
    {
      "type": "node",
      "id": 3110188129,
      "lat": 31.6823102,
      "lon": 34.6097257
    },
    {
      "type": "node",
      "id": 3110188132,
      "lat": 31.68231,
      "lon": 34.6099361
    },
    {
      "type": "node",
      "id": 3110188140,
      "lat": 31.6805035,
      "lon": 34.60937
    },
    {
      "type": "node",
      "id": 3176511353,
      "lat": 31.6770458,
      "lon": 34.6096891
    },
    {
      "type": "node",
      "id": 3176511566,
      "lat": 31.680284,
      "lon": 34.6097539
    },
    {
      "type": "node",
      "id": 3176511606,
      "lat": 31.6753607,
      "lon": 34.6094993
    },
    {
      "type": "node",
      "id": 3176511633,
      "lat": 31.6794623,
      "lon": 34.6099454
    },
    {
      "type": "node",
      "id": 3191818659,
      "lat": 31.6855101,
      "lon": 34.6105666
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
      "id": 3477542847,
      "lat": 31.6907968,
      "lon": 34.5990825
    },
    {
      "type": "node",
      "id": 3477542848,
      "lat": 31.6817518,
      "lon": 34.6062396
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
      "id": 3477542876,
      "lat": 31.6806105,
      "lon": 34.5900967
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
      "id": 3477543198,
      "lat": 31.6820966,
      "lon": 34.590687
    },
    {
      "type": "node",
      "id": 3477543200,
      "lat": 31.6807859,
      "lon": 34.5949313
    },
    {
      "type": "node",
      "id": 3477543208,
      "lat": 31.6785183,
      "lon": 34.5894095
    },
    {
      "type": "node",
      "id": 3477543209,
      "lat": 31.6818314,
      "lon": 34.5908163
    },
    {
      "type": "node",
      "id": 3477543210,
      "lat": 31.6790399,
      "lon": 34.5895721
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
      "id": 3477543215,
      "lat": 31.681882,
      "lon": 34.5908733
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
      "id": 3477543228,
      "lat": 31.6819353,
      "lon": 34.5905552
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
      "id": 3477543238,
      "lat": 31.6801355,
      "lon": 34.590043
    },
    {
      "type": "node",
      "id": 3477543243,
      "lat": 31.6818403,
      "lon": 34.5906187
    },
    {
      "type": "node",
      "id": 3477543245,
      "lat": 31.6805756,
      "lon": 34.5950981
    },
    {
      "type": "node",
      "id": 3477543251,
      "lat": 31.6818583,
      "lon": 34.6061988
    },
    {
      "type": "node",
      "id": 3477543258,
      "lat": 31.6820996,
      "lon": 34.5907412
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
      "id": 3477543266,
      "lat": 31.6820496,
      "lon": 34.5905951
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
      "id": 3477543270,
      "lat": 31.6795642,
      "lon": 34.58987
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
      "id": 3477543273,
      "lat": 31.6789976,
      "lon": 34.5896882
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
      "id": 3477543282,
      "lat": 31.6819172,
      "lon": 34.5908903
    },
    {
      "type": "node",
      "id": 3477543284,
      "lat": 31.6811071,
      "lon": 34.6005785
    },
    {
      "type": "node",
      "id": 3477543286,
      "lat": 31.6820184,
      "lon": 34.5908787
    },
    {
      "type": "node",
      "id": 3477543287,
      "lat": 31.6883498,
      "lon": 34.6050855
    },
    {
      "type": "node",
      "id": 3477543288,
      "lat": 31.6820794,
      "lon": 34.5906366
    },
    {
      "type": "node",
      "id": 3477543289,
      "lat": 31.6808615,
      "lon": 34.5951426
    },
    {
      "type": "node",
      "id": 3477543593,
      "lat": 31.6820908,
      "lon": 34.5907853
    },
    {
      "type": "node",
      "id": 3477543594,
      "lat": 31.6808746,
      "lon": 34.5902118
    },
    {
      "type": "node",
      "id": 3477543595,
      "lat": 31.6884819,
      "lon": 34.6053557
    },
    {
      "type": "node",
      "id": 3477543596,
      "lat": 31.681867,
      "lon": 34.5905881
    },
    {
      "type": "node",
      "id": 3477543598,
      "lat": 31.6819961,
      "lon": 34.5905608
    },
    {
      "type": "node",
      "id": 3477543602,
      "lat": 31.686338,
      "lon": 34.5925496
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
      "id": 3477543632,
      "lat": 31.6862997,
      "lon": 34.5926721
    },
    {
      "type": "node",
      "id": 3477543635,
      "lat": 31.6819875,
      "lon": 34.5908916
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
      "id": 3477543640,
      "lat": 31.6820726,
      "lon": 34.5908252
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
      "id": 3477543667,
      "lat": 31.6801656,
      "lon": 34.589935
    },
    {
      "type": "node",
      "id": 3477543668,
      "lat": 31.6831313,
      "lon": 34.6027463
    },
    {
      "type": "node",
      "id": 3477543670,
      "lat": 31.6908468,
      "lon": 34.5989623
    },
    {
      "type": "node",
      "id": 3477543674,
      "lat": 31.6810598,
      "lon": 34.6007462
    },
    {
      "type": "node",
      "id": 3477543678,
      "lat": 31.6821571,
      "lon": 34.5908976
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
      "id": 3477543903,
      "lat": 31.6818099,
      "lon": 34.5907448
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
      "id": 3477543918,
      "lat": 31.6820244,
      "lon": 34.5905747
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
      "id": 3477543925,
      "lat": 31.6796005,
      "lon": 34.5897558
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
      "id": 3477543956,
      "lat": 31.6805856,
      "lon": 34.5902045
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
      "id": 3477543960,
      "lat": 31.681966,
      "lon": 34.5905542
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
      "id": 3477543966,
      "lat": 31.6818105,
      "lon": 34.5907001
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
      "id": 3477543974,
      "lat": 31.682046,
      "lon": 34.5908581
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
      "id": 3477544106,
      "lat": 31.6818173,
      "lon": 34.590782
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
      "id": 3477544111,
      "lat": 31.6818208,
      "lon": 34.5906571
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
      "id": 3477544169,
      "lat": 31.6818993,
      "lon": 34.5905665
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
      "id": 3477544179,
      "lat": 31.6808488,
      "lon": 34.5903239
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
      "id": 3477544191,
      "lat": 31.6821943,
      "lon": 34.590782
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
      "id": 3477544296,
      "lat": 31.6784863,
      "lon": 34.5895291
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
      "id": 3485984637,
      "lat": 31.6830385,
      "lon": 34.5876257
    },
    {
      "type": "node",
      "id": 3485984643,
      "lat": 31.6788077,
      "lon": 34.59579
    },
    {
      "type": "node",
      "id": 3485984647,
      "lat": 31.6787363,
      "lon": 34.5954783
    },
    {
      "type": "node",
      "id": 3485984655,
      "lat": 31.6828764,
      "lon": 34.58756
    },
    {
      "type": "node",
      "id": 3485984657,
      "lat": 31.6789907,
      "lon": 34.5960159
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
      "id": 3485984670,
      "lat": 31.6896531,
      "lon": 34.6027691
    },
    {
      "type": "node",
      "id": 3485984673,
      "lat": 31.6877312,
      "lon": 34.6017931
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
      "id": 3485984691,
      "lat": 31.6896863,
      "lon": 34.6026436
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
      "id": 3485984929,
      "lat": 31.6788615,
      "lon": 34.5959331
    },
    {
      "type": "node",
      "id": 3608459847,
      "lat": 31.6819706,
      "lon": 34.605989
    },
    {
      "type": "node",
      "id": 3608459891,
      "lat": 31.6762738,
      "lon": 34.5978685
    },
    {
      "type": "node",
      "id": 3608459892,
      "lat": 31.6763757,
      "lon": 34.5977288
    },
    {
      "type": "node",
      "id": 3708141693,
      "lat": 31.677198,
      "lon": 34.5915317
    },
    {
      "type": "node",
      "id": 3708141694,
      "lat": 31.6779327,
      "lon": 34.5891206
    },
    {
      "type": "node",
      "id": 3708141695,
      "lat": 31.678058,
      "lon": 34.5894165
    },
    {
      "type": "node",
      "id": 3708141696,
      "lat": 31.6876194,
      "lon": 34.6017443
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
      "id": 3708141699,
      "lat": 31.6781069,
      "lon": 34.5892776
    },
    {
      "type": "node",
      "id": 3708141700,
      "lat": 31.6780806,
      "lon": 34.5891898
    },
    {
      "type": "node",
      "id": 3708141702,
      "lat": 31.6771372,
      "lon": 34.5917006
    },
    {
      "type": "node",
      "id": 3708141711,
      "lat": 31.6756787,
      "lon": 34.5893351
    },
    {
      "type": "node",
      "id": 3708141712,
      "lat": 31.6756232,
      "lon": 34.5891294
    },
    {
      "type": "node",
      "id": 3708141713,
      "lat": 31.6757608,
      "lon": 34.5895833
    },
    {
      "type": "node",
      "id": 3708141714,
      "lat": 31.6758459,
      "lon": 34.5897955
    },
    {
      "type": "node",
      "id": 3708141715,
      "lat": 31.6759662,
      "lon": 34.5900374
    },
    {
      "type": "node",
      "id": 3708141716,
      "lat": 31.6760977,
      "lon": 34.5902472
    },
    {
      "type": "node",
      "id": 3708141717,
      "lat": 31.676215,
      "lon": 34.5904101
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
      "id": 3708141724,
      "lat": 31.6797913,
      "lon": 34.5927612
    },
    {
      "type": "node",
      "id": 3708142528,
      "lat": 31.6792343,
      "lon": 34.5940236
    },
    {
      "type": "node",
      "id": 3708142529,
      "lat": 31.6785951,
      "lon": 34.5928633
    },
    {
      "type": "node",
      "id": 3708142530,
      "lat": 31.6788391,
      "lon": 34.5927108
    },
    {
      "type": "node",
      "id": 3708142531,
      "lat": 31.6779149,
      "lon": 34.5894471
    },
    {
      "type": "node",
      "id": 3708142532,
      "lat": 31.678949,
      "lon": 34.5926649
    },
    {
      "type": "node",
      "id": 3708142533,
      "lat": 31.6877612,
      "lon": 34.5991929
    },
    {
      "type": "node",
      "id": 3708142534,
      "lat": 31.6790878,
      "lon": 34.5926295
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
      "id": 3708142537,
      "lat": 31.6792562,
      "lon": 34.5926174
    },
    {
      "type": "node",
      "id": 3708142538,
      "lat": 31.679446,
      "lon": 34.5926388
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
      "id": 3708142542,
      "lat": 31.6796615,
      "lon": 34.5927014
    },
    {
      "type": "node",
      "id": 3708142543,
      "lat": 31.6804704,
      "lon": 34.5930537
    },
    {
      "type": "node",
      "id": 3708142544,
      "lat": 31.6772778,
      "lon": 34.5915395
    },
    {
      "type": "node",
      "id": 3708142545,
      "lat": 31.677896,
      "lon": 34.5894412
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
      "id": 3708142548,
      "lat": 31.6882834,
      "lon": 34.6034953
    },
    {
      "type": "node",
      "id": 3708142549,
      "lat": 31.6778166,
      "lon": 34.589305
    },
    {
      "type": "node",
      "id": 3708142550,
      "lat": 31.6880591,
      "lon": 34.6040228
    },
    {
      "type": "node",
      "id": 3708142551,
      "lat": 31.6872695,
      "lon": 34.6028333
    },
    {
      "type": "node",
      "id": 3708142553,
      "lat": 31.6881896,
      "lon": 34.6037527
    },
    {
      "type": "node",
      "id": 3708142554,
      "lat": 31.6820558,
      "lon": 34.5977767
    },
    {
      "type": "node",
      "id": 3708142556,
      "lat": 31.6771798,
      "lon": 34.5917533
    },
    {
      "type": "node",
      "id": 3708142557,
      "lat": 31.6773316,
      "lon": 34.5916698
    },
    {
      "type": "node",
      "id": 3708142558,
      "lat": 31.6771527,
      "lon": 34.5915666
    },
    {
      "type": "node",
      "id": 3708142559,
      "lat": 31.6780803,
      "lon": 34.5893836
    },
    {
      "type": "node",
      "id": 3708142560,
      "lat": 31.6883586,
      "lon": 34.5994446
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
      "id": 3708142564,
      "lat": 31.6772249,
      "lon": 34.5915258
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
      "id": 3708142572,
      "lat": 31.6771544,
      "lon": 34.59173
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
      "id": 3708142579,
      "lat": 31.6885433,
      "lon": 34.6026406
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
      "id": 3708142590,
      "lat": 31.6780949,
      "lon": 34.5892198
    },
    {
      "type": "node",
      "id": 3708142591,
      "lat": 31.6803466,
      "lon": 34.5934908
    },
    {
      "type": "node",
      "id": 3708142592,
      "lat": 31.6780895,
      "lon": 34.58937
    },
    {
      "type": "node",
      "id": 3708142593,
      "lat": 31.6803955,
      "lon": 34.5933242
    },
    {
      "type": "node",
      "id": 3708142594,
      "lat": 31.6778489,
      "lon": 34.5891804
    },
    {
      "type": "node",
      "id": 3708142596,
      "lat": 31.6814741,
      "lon": 34.5985641
    },
    {
      "type": "node",
      "id": 3708142597,
      "lat": 31.6779536,
      "lon": 34.5894592
    },
    {
      "type": "node",
      "id": 3708142600,
      "lat": 31.6869616,
      "lon": 34.6036376
    },
    {
      "type": "node",
      "id": 3708142602,
      "lat": 31.6771733,
      "lon": 34.5915456
    },
    {
      "type": "node",
      "id": 3708142603,
      "lat": 31.6894079,
      "lon": 34.5999027
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
      "id": 3708142607,
      "lat": 31.678725,
      "lon": 34.5927695
    },
    {
      "type": "node",
      "id": 3708142608,
      "lat": 31.6778301,
      "lon": 34.5893622
    },
    {
      "type": "node",
      "id": 3708142609,
      "lat": 31.6780447,
      "lon": 34.5891479
    },
    {
      "type": "node",
      "id": 3708142610,
      "lat": 31.6875815,
      "lon": 34.6018625
    },
    {
      "type": "node",
      "id": 3708142611,
      "lat": 31.6780038,
      "lon": 34.5894521
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
      "id": 3708142616,
      "lat": 31.6773042,
      "lon": 34.5915625
    },
    {
      "type": "node",
      "id": 3708142617,
      "lat": 31.6815612,
      "lon": 34.5986039
    },
    {
      "type": "node",
      "id": 3708142619,
      "lat": 31.675569,
      "lon": 34.588941
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
      "id": 3708142624,
      "lat": 31.6771361,
      "lon": 34.5915965
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
      "id": 3708142637,
      "lat": 31.6778555,
      "lon": 34.5894056
    },
    {
      "type": "node",
      "id": 3708142639,
      "lat": 31.6819859,
      "lon": 34.5967134
    },
    {
      "type": "node",
      "id": 3708142640,
      "lat": 31.6778499,
      "lon": 34.5891785
    },
    {
      "type": "node",
      "id": 3708142642,
      "lat": 31.6772521,
      "lon": 34.5915285
    },
    {
      "type": "node",
      "id": 3708142645,
      "lat": 31.6773204,
      "lon": 34.5917061
    },
    {
      "type": "node",
      "id": 3708142646,
      "lat": 31.6773231,
      "lon": 34.5915942
    },
    {
      "type": "node",
      "id": 3708142647,
      "lat": 31.6809733,
      "lon": 34.5984285
    },
    {
      "type": "node",
      "id": 3708142648,
      "lat": 31.6771276,
      "lon": 34.5916308
    },
    {
      "type": "node",
      "id": 3708142649,
      "lat": 31.6772733,
      "lon": 34.5917575
    },
    {
      "type": "node",
      "id": 3708142650,
      "lat": 31.6772101,
      "lon": 34.5917664
    },
    {
      "type": "node",
      "id": 3708142651,
      "lat": 31.6781035,
      "lon": 34.5892613
    },
    {
      "type": "node",
      "id": 3708142652,
      "lat": 31.684118,
      "lon": 34.5995785
    },
    {
      "type": "node",
      "id": 3708142653,
      "lat": 31.677128,
      "lon": 34.5916665
    },
    {
      "type": "node",
      "id": 3708142654,
      "lat": 31.6778246,
      "lon": 34.58923
    },
    {
      "type": "node",
      "id": 3708142655,
      "lat": 31.6773325,
      "lon": 34.5916312
    },
    {
      "type": "node",
      "id": 3708142656,
      "lat": 31.6778856,
      "lon": 34.5891423
    },
    {
      "type": "node",
      "id": 3708142657,
      "lat": 31.6808941,
      "lon": 34.5965658
    },
    {
      "type": "node",
      "id": 3708142658,
      "lat": 31.6884137,
      "lon": 34.6030732
    },
    {
      "type": "node",
      "id": 3708142659,
      "lat": 31.6829527,
      "lon": 34.6004973
    },
    {
      "type": "node",
      "id": 3708142660,
      "lat": 31.6778171,
      "lon": 34.5893005
    },
    {
      "type": "node",
      "id": 3708142662,
      "lat": 31.6779988,
      "lon": 34.5891229
    },
    {
      "type": "node",
      "id": 3708142663,
      "lat": 31.6772423,
      "lon": 34.5917678
    },
    {
      "type": "node",
      "id": 3708142664,
      "lat": 31.6781012,
      "lon": 34.5893366
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
      "id": 3708142667,
      "lat": 31.6765775,
      "lon": 34.5923524
    },
    {
      "type": "node",
      "id": 3709736021,
      "lat": 31.6860429,
      "lon": 34.5969011
    },
    {
      "type": "node",
      "id": 3709736022,
      "lat": 31.687277,
      "lon": 34.5929503
    },
    {
      "type": "node",
      "id": 3709736025,
      "lat": 31.6842245,
      "lon": 34.5908397
    },
    {
      "type": "node",
      "id": 3709736028,
      "lat": 31.6846182,
      "lon": 34.5895957
    },
    {
      "type": "node",
      "id": 3709736030,
      "lat": 31.6899753,
      "lon": 34.5942467
    },
    {
      "type": "node",
      "id": 3709736031,
      "lat": 31.6902832,
      "lon": 34.5909678
    },
    {
      "type": "node",
      "id": 3709736032,
      "lat": 31.6903207,
      "lon": 34.5908043
    },
    {
      "type": "node",
      "id": 3709736033,
      "lat": 31.690673,
      "lon": 34.5959991
    },
    {
      "type": "node",
      "id": 3709736034,
      "lat": 31.6903116,
      "lon": 34.5906836
    },
    {
      "type": "node",
      "id": 3709736035,
      "lat": 31.6902572,
      "lon": 34.5905758
    },
    {
      "type": "node",
      "id": 3709736036,
      "lat": 31.6853958,
      "lon": 34.588473
    },
    {
      "type": "node",
      "id": 3709736037,
      "lat": 31.6852649,
      "lon": 34.5884099
    },
    {
      "type": "node",
      "id": 3709736038,
      "lat": 31.6851875,
      "lon": 34.5883868
    },
    {
      "type": "node",
      "id": 3709736039,
      "lat": 31.6850998,
      "lon": 34.5884038
    },
    {
      "type": "node",
      "id": 3709736040,
      "lat": 31.6850282,
      "lon": 34.5884479
    },
    {
      "type": "node",
      "id": 3709736042,
      "lat": 31.6849693,
      "lon": 34.5885257
    },
    {
      "type": "node",
      "id": 3709736043,
      "lat": 31.6824705,
      "lon": 34.5943099
    },
    {
      "type": "node",
      "id": 3709736044,
      "lat": 31.6898731,
      "lon": 34.5985519
    },
    {
      "type": "node",
      "id": 3709736045,
      "lat": 31.6843387,
      "lon": 34.5882462
    },
    {
      "type": "node",
      "id": 3709736047,
      "lat": 31.6843383,
      "lon": 34.5881581
    },
    {
      "type": "node",
      "id": 3709736048,
      "lat": 31.6843017,
      "lon": 34.588064
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
      "id": 3709736051,
      "lat": 31.691257,
      "lon": 34.5909807
    },
    {
      "type": "node",
      "id": 3709736052,
      "lat": 31.689182,
      "lon": 34.5967858
    },
    {
      "type": "node",
      "id": 3709736054,
      "lat": 31.6858983,
      "lon": 34.5939545
    },
    {
      "type": "node",
      "id": 3709736056,
      "lat": 31.6923975,
      "lon": 34.5915305
    },
    {
      "type": "node",
      "id": 3709736057,
      "lat": 31.6917268,
      "lon": 34.592672
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
      "id": 3709736065,
      "lat": 31.6911539,
      "lon": 34.5909658
    },
    {
      "type": "node",
      "id": 3709736066,
      "lat": 31.6932861,
      "lon": 34.5920454
    },
    {
      "type": "node",
      "id": 3709736069,
      "lat": 31.6889804,
      "lon": 34.5952777
    },
    {
      "type": "node",
      "id": 3709736070,
      "lat": 31.6909178,
      "lon": 34.591258
    },
    {
      "type": "node",
      "id": 3709736076,
      "lat": 31.6856916,
      "lon": 34.5952797
    },
    {
      "type": "node",
      "id": 3709736077,
      "lat": 31.6909792,
      "lon": 34.5911076
    },
    {
      "type": "node",
      "id": 3709736078,
      "lat": 31.6900185,
      "lon": 34.5941199
    },
    {
      "type": "node",
      "id": 3709736079,
      "lat": 31.6922034,
      "lon": 34.5914321
    },
    {
      "type": "node",
      "id": 3709736080,
      "lat": 31.6889173,
      "lon": 34.5914355
    },
    {
      "type": "node",
      "id": 3709736081,
      "lat": 31.6842508,
      "lon": 34.5880005
    },
    {
      "type": "node",
      "id": 3709736082,
      "lat": 31.6841712,
      "lon": 34.5879571
    },
    {
      "type": "node",
      "id": 3709736083,
      "lat": 31.6895758,
      "lon": 34.5955313
    },
    {
      "type": "node",
      "id": 3709736084,
      "lat": 31.6885992,
      "lon": 34.5965278
    },
    {
      "type": "node",
      "id": 3709736085,
      "lat": 31.6815814,
      "lon": 34.5921084
    },
    {
      "type": "node",
      "id": 3709736087,
      "lat": 31.6849264,
      "lon": 34.5886248
    },
    {
      "type": "node",
      "id": 3709736088,
      "lat": 31.6882879,
      "lon": 34.5897185
    },
    {
      "type": "node",
      "id": 3709736089,
      "lat": 31.6826413,
      "lon": 34.5887484
    },
    {
      "type": "node",
      "id": 3709736090,
      "lat": 31.6829621,
      "lon": 34.592711
    },
    {
      "type": "node",
      "id": 3709736091,
      "lat": 31.6893202,
      "lon": 34.5901477
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
      "id": 3709736095,
      "lat": 31.6834379,
      "lon": 34.5911409
    },
    {
      "type": "node",
      "id": 3709736096,
      "lat": 31.6811983,
      "lon": 34.5933538
    },
    {
      "type": "node",
      "id": 3709736097,
      "lat": 31.6843219,
      "lon": 34.5883439
    },
    {
      "type": "node",
      "id": 3709736099,
      "lat": 31.687887,
      "lon": 34.591
    },
    {
      "type": "node",
      "id": 3709736101,
      "lat": 31.6864445,
      "lon": 34.5956133
    },
    {
      "type": "node",
      "id": 3709736103,
      "lat": 31.6913447,
      "lon": 34.5910143
    },
    {
      "type": "node",
      "id": 3709736106,
      "lat": 31.6825691,
      "lon": 34.5939564
    },
    {
      "type": "node",
      "id": 3709736107,
      "lat": 31.6899839,
      "lon": 34.5918996
    },
    {
      "type": "node",
      "id": 3709736108,
      "lat": 31.6901686,
      "lon": 34.5905081
    },
    {
      "type": "node",
      "id": 3709736109,
      "lat": 31.6919501,
      "lon": 34.592799
    },
    {
      "type": "node",
      "id": 3709736112,
      "lat": 31.691594,
      "lon": 34.5925999
    },
    {
      "type": "node",
      "id": 3709736113,
      "lat": 31.6887791,
      "lon": 34.5980782
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
      "id": 3709736122,
      "lat": 31.6831408,
      "lon": 34.5874983
    },
    {
      "type": "node",
      "id": 3709736123,
      "lat": 31.684716,
      "lon": 34.59486
    },
    {
      "type": "node",
      "id": 3709736126,
      "lat": 31.6902868,
      "lon": 34.5972537
    },
    {
      "type": "node",
      "id": 3709736128,
      "lat": 31.6831778,
      "lon": 34.5942132
    },
    {
      "type": "node",
      "id": 3709736129,
      "lat": 31.6910467,
      "lon": 34.5910219
    },
    {
      "type": "node",
      "id": 3709736130,
      "lat": 31.6835675,
      "lon": 34.5929566
    },
    {
      "type": "node",
      "id": 3709736131,
      "lat": 31.690627,
      "lon": 34.5921711
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
      "id": 3709736137,
      "lat": 31.6855381,
      "lon": 34.5922085
    },
    {
      "type": "node",
      "id": 3709736139,
      "lat": 31.6865338,
      "lon": 34.5889672
    },
    {
      "type": "node",
      "id": 3709736140,
      "lat": 31.6840139,
      "lon": 34.5893288
    },
    {
      "type": "node",
      "id": 3709736141,
      "lat": 31.6861401,
      "lon": 34.5902488
    },
    {
      "type": "node",
      "id": 3709736144,
      "lat": 31.6857656,
      "lon": 34.5914677
    },
    {
      "type": "node",
      "id": 3924172671,
      "lat": 31.6748885,
      "lon": 34.5980056
    },
    {
      "type": "node",
      "id": 3924172684,
      "lat": 31.6739078,
      "lon": 34.5980767
    },
    {
      "type": "node",
      "id": 3924172716,
      "lat": 31.6773886,
      "lon": 34.5936407
    },
    {
      "type": "node",
      "id": 4260308986,
      "lat": 31.6762045,
      "lon": 34.5975006
    },
    {
      "type": "node",
      "id": 4260591978,
      "lat": 31.6899317,
      "lon": 34.6028117
    },
    {
      "type": "node",
      "id": 4403234149,
      "lat": 31.6760365,
      "lon": 34.6100261
    },
    {
      "type": "node",
      "id": 4403234150,
      "lat": 31.6759621,
      "lon": 34.6098692
    },
    {
      "type": "node",
      "id": 4616078646,
      "lat": 31.6777029,
      "lon": 34.6060411
    },
    {
      "type": "node",
      "id": 4730768488,
      "lat": 31.676567,
      "lon": 34.6062387
    },
    {
      "type": "node",
      "id": 4730768489,
      "lat": 31.6764923,
      "lon": 34.6061551
    },
    {
      "type": "node",
      "id": 4730768491,
      "lat": 31.6777034,
      "lon": 34.6064842
    },
    {
      "type": "node",
      "id": 4799899398,
      "lat": 31.6891847,
      "lon": 34.6044558
    },
    {
      "type": "node",
      "id": 4799899401,
      "lat": 31.6892373,
      "lon": 34.6043269
    },
    {
      "type": "node",
      "id": 4799899402,
      "lat": 31.6892846,
      "lon": 34.6041927
    },
    {
      "type": "node",
      "id": 4799899404,
      "lat": 31.6892938,
      "lon": 34.6041638
    },
    {
      "type": "node",
      "id": 4799899407,
      "lat": 31.6896582,
      "lon": 34.6029994
    },
    {
      "type": "node",
      "id": 4799899640,
      "lat": 31.6908452,
      "lon": 34.5992203
    },
    {
      "type": "node",
      "id": 4799899648,
      "lat": 31.6909477,
      "lon": 34.5992645
    },
    {
      "type": "node",
      "id": 4799899650,
      "lat": 31.6913092,
      "lon": 34.5977096
    },
    {
      "type": "node",
      "id": 4799899673,
      "lat": 31.6908042,
      "lon": 34.5997028
    },
    {
      "type": "node",
      "id": 4799899674,
      "lat": 31.6898294,
      "lon": 34.602452
    },
    {
      "type": "node",
      "id": 4799899676,
      "lat": 31.6904592,
      "lon": 34.6004366
    },
    {
      "type": "node",
      "id": 4799899679,
      "lat": 31.6896962,
      "lon": 34.6028743
    },
    {
      "type": "node",
      "id": 4799899682,
      "lat": 31.6898916,
      "lon": 34.6026253
    },
    {
      "type": "node",
      "id": 4799899683,
      "lat": 31.6897882,
      "lon": 34.6025836
    },
    {
      "type": "node",
      "id": 4799899689,
      "lat": 31.6898045,
      "lon": 34.6029218
    },
    {
      "type": "node",
      "id": 4799899698,
      "lat": 31.6890016,
      "lon": 34.6050153
    },
    {
      "type": "node",
      "id": 4799899700,
      "lat": 31.6890806,
      "lon": 34.6048972
    },
    {
      "type": "node",
      "id": 4799899701,
      "lat": 31.6891539,
      "lon": 34.6047742
    },
    {
      "type": "node",
      "id": 4799899702,
      "lat": 31.6892215,
      "lon": 34.6046467
    },
    {
      "type": "node",
      "id": 4799899704,
      "lat": 31.6892829,
      "lon": 34.6045151
    },
    {
      "type": "node",
      "id": 4799899709,
      "lat": 31.6893381,
      "lon": 34.6043798
    },
    {
      "type": "node",
      "id": 4799899710,
      "lat": 31.6893973,
      "lon": 34.6042089
    },
    {
      "type": "node",
      "id": 4799899719,
      "lat": 31.6904856,
      "lon": 34.6003517
    },
    {
      "type": "node",
      "id": 4799899720,
      "lat": 31.6917026,
      "lon": 34.5964498
    },
    {
      "type": "node",
      "id": 4799899723,
      "lat": 31.6887496,
      "lon": 34.6054418
    },
    {
      "type": "node",
      "id": 4799899725,
      "lat": 31.6897608,
      "lon": 34.6030472
    },
    {
      "type": "node",
      "id": 4799899726,
      "lat": 31.6886708,
      "lon": 34.6055649
    },
    {
      "type": "node",
      "id": 4799899727,
      "lat": 31.6893873,
      "lon": 34.6042402
    },
    {
      "type": "node",
      "id": 4799899729,
      "lat": 31.6905953,
      "lon": 34.6003923
    },
    {
      "type": "node",
      "id": 4799899739,
      "lat": 31.689934,
      "lon": 34.6024936
    },
    {
      "type": "node",
      "id": 4799899740,
      "lat": 31.6905629,
      "lon": 34.6004812
    },
    {
      "type": "node",
      "id": 4799899745,
      "lat": 31.6889167,
      "lon": 34.6049324
    },
    {
      "type": "node",
      "id": 4799899746,
      "lat": 31.6890619,
      "lon": 34.6047027
    },
    {
      "type": "node",
      "id": 4799899747,
      "lat": 31.6928232,
      "lon": 34.5932889
    },
    {
      "type": "node",
      "id": 4799899748,
      "lat": 31.6891262,
      "lon": 34.6045812
    },
    {
      "type": "node",
      "id": 4799899750,
      "lat": 31.688992,
      "lon": 34.6048198
    },
    {
      "type": "node",
      "id": 4799899755,
      "lat": 31.6907005,
      "lon": 34.5996583
    },
    {
      "type": "node",
      "id": 4799911909,
      "lat": 31.6888388,
      "lon": 34.605224
    },
    {
      "type": "node",
      "id": 4799911910,
      "lat": 31.6889072,
      "lon": 34.6051441
    },
    {
      "type": "node",
      "id": 4799912243,
      "lat": 31.6887463,
      "lon": 34.6051465
    },
    {
      "type": "node",
      "id": 4799912244,
      "lat": 31.6887626,
      "lon": 34.6051293
    },
    {
      "type": "node",
      "id": 4799912245,
      "lat": 31.688829,
      "lon": 34.6050517
    },
    {
      "type": "node",
      "id": 4799912246,
      "lat": 31.6886543,
      "lon": 34.60526
    },
    {
      "type": "node",
      "id": 4799912247,
      "lat": 31.6884793,
      "lon": 34.6054685
    },
    {
      "type": "node",
      "id": 4799912248,
      "lat": 31.6887375,
      "lon": 34.6053451
    },
    {
      "type": "node",
      "id": 4799912249,
      "lat": 31.6885438,
      "lon": 34.6055596
    },
    {
      "type": "node",
      "id": 4799912252,
      "lat": 31.6888283,
      "lon": 34.6052351
    },
    {
      "type": "node",
      "id": 4800618688,
      "lat": 31.6898488,
      "lon": 34.6025948
    },
    {
      "type": "node",
      "id": 4800618689,
      "lat": 31.6897395,
      "lon": 34.6025972
    },
    {
      "type": "node",
      "id": 4800618690,
      "lat": 31.6898951,
      "lon": 34.6028763
    },
    {
      "type": "node",
      "id": 4800618691,
      "lat": 31.6885589,
      "lon": 34.6052643
    },
    {
      "type": "node",
      "id": 4800618692,
      "lat": 31.6899407,
      "lon": 34.6027539
    },
    {
      "type": "node",
      "id": 4800618693,
      "lat": 31.6887258,
      "lon": 34.6055108
    },
    {
      "type": "node",
      "id": 4800618694,
      "lat": 31.6886381,
      "lon": 34.6055773
    },
    {
      "type": "node",
      "id": 4800618695,
      "lat": 31.6896666,
      "lon": 34.6028258
    },
    {
      "type": "node",
      "id": 4800618696,
      "lat": 31.6897376,
      "lon": 34.6029073
    },
    {
      "type": "node",
      "id": 4800618697,
      "lat": 31.6896612,
      "lon": 34.6026945
    },
    {
      "type": "node",
      "id": 4800618698,
      "lat": 31.6885896,
      "lon": 34.6055782
    },
    {
      "type": "node",
      "id": 4800618699,
      "lat": 31.6898532,
      "lon": 34.6029085
    },
    {
      "type": "node",
      "id": 4800618700,
      "lat": 31.6899323,
      "lon": 34.6026959
    },
    {
      "type": "node",
      "id": 4800618701,
      "lat": 31.6886063,
      "lon": 34.6052523
    },
    {
      "type": "node",
      "id": 4800618702,
      "lat": 31.6884721,
      "lon": 34.6054115
    },
    {
      "type": "node",
      "id": 4800618703,
      "lat": 31.6887092,
      "lon": 34.6052988
    },
    {
      "type": "node",
      "id": 4800618704,
      "lat": 31.6885025,
      "lon": 34.6055185
    },
    {
      "type": "node",
      "id": 4800618705,
      "lat": 31.6884985,
      "lon": 34.6053201
    },
    {
      "type": "node",
      "id": 4800618706,
      "lat": 31.6887487,
      "lon": 34.6053849
    },
    {
      "type": "node",
      "id": 4911250754,
      "lat": 31.6761473,
      "lon": 34.6099789
    },
    {
      "type": "node",
      "id": 4911250755,
      "lat": 31.6761638,
      "lon": 34.6097065
    },
    {
      "type": "node",
      "id": 4911250756,
      "lat": 31.6760457,
      "lon": 34.6097702
    },
    {
      "type": "node",
      "id": 5040583316,
      "lat": 31.6876597,
      "lon": 34.6116901
    },
    {
      "type": "node",
      "id": 5040584301,
      "lat": 31.6801014,
      "lon": 34.6078253
    },
    {
      "type": "node",
      "id": 5207288892,
      "lat": 31.6842943,
      "lon": 34.5962872
    },
    {
      "type": "node",
      "id": 5249062577,
      "lat": 31.6770091,
      "lon": 34.5914202
    },
    {
      "type": "node",
      "id": 5249062579,
      "lat": 31.6773211,
      "lon": 34.5914129
    },
    {
      "type": "node",
      "id": 5249062582,
      "lat": 31.6773668,
      "lon": 34.5912817
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
      "id": 5357534694,
      "lat": 31.6789904,
      "lon": 34.6099404
    },
    {
      "type": "node",
      "id": 5357534700,
      "lat": 31.6829827,
      "lon": 34.6097237
    },
    {
      "type": "node",
      "id": 5357538728,
      "lat": 31.6802481,
      "lon": 34.6097535
    },
    {
      "type": "node",
      "id": 5357538744,
      "lat": 31.6796498,
      "lon": 34.6069503
    },
    {
      "type": "node",
      "id": 5357538765,
      "lat": 31.6825487,
      "lon": 34.6099325
    },
    {
      "type": "node",
      "id": 5357538781,
      "lat": 31.6772217,
      "lon": 34.6098982
    },
    {
      "type": "node",
      "id": 5399846689,
      "lat": 31.680737,
      "lon": 34.5894147
    },
    {
      "type": "node",
      "id": 5922766670,
      "lat": 31.6916791,
      "lon": 34.5911771
    },
    {
      "type": "node",
      "id": 5922766671,
      "lat": 31.6911579,
      "lon": 34.5923891
    },
    {
      "type": "node",
      "id": 5922766672,
      "lat": 31.6927695,
      "lon": 34.5917528
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
      "id": 5931062452,
      "lat": 31.6872077,
      "lon": 34.6009767
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
      "id": 5954807896,
      "lat": 31.6760746,
      "lon": 34.6095986
    },
    {
      "type": "node",
      "id": 5971432505,
      "lat": 31.6761789,
      "lon": 34.6095408
    },
    {
      "type": "node",
      "id": 5971432511,
      "lat": 31.6765243,
      "lon": 34.6096053
    },
    {
      "type": "node",
      "id": 5971432512,
      "lat": 31.6763609,
      "lon": 34.6094926
    },
    {
      "type": "node",
      "id": 5971432513,
      "lat": 31.6762604,
      "lon": 34.6093611
    },
    {
      "type": "node",
      "id": 5971432514,
      "lat": 31.6762193,
      "lon": 34.6092619
    },
    {
      "type": "node",
      "id": 5971432515,
      "lat": 31.6761724,
      "lon": 34.6091758
    },
    {
      "type": "node",
      "id": 5971432516,
      "lat": 31.6759916,
      "lon": 34.6093316
    },
    {
      "type": "node",
      "id": 5971432517,
      "lat": 31.6760413,
      "lon": 34.6092539
    },
    {
      "type": "node",
      "id": 5971432518,
      "lat": 31.6760618,
      "lon": 34.60916
    },
    {
      "type": "node",
      "id": 5971432519,
      "lat": 31.6760618,
      "lon": 34.6091063
    },
    {
      "type": "node",
      "id": 5971432520,
      "lat": 31.6761543,
      "lon": 34.6098427
    },
    {
      "type": "node",
      "id": 5971432541,
      "lat": 31.6765761,
      "lon": 34.6097935
    },
    {
      "type": "node",
      "id": 5971432542,
      "lat": 31.6765986,
      "lon": 34.6096173
    },
    {
      "type": "node",
      "id": 5971432563,
      "lat": 31.6756439,
      "lon": 34.6094145
    },
    {
      "type": "node",
      "id": 5971432564,
      "lat": 31.6756149,
      "lon": 34.6095736
    },
    {
      "type": "node",
      "id": 5971432584,
      "lat": 31.6768004,
      "lon": 34.6130352
    },
    {
      "type": "node",
      "id": 6013351621,
      "lat": 31.6761066,
      "lon": 34.609694
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
      "id": 6025530418,
      "lat": 31.6746901,
      "lon": 34.5895825
    },
    {
      "type": "node",
      "id": 6379379027,
      "lat": 31.6766309,
      "lon": 34.6128184
    },
    {
      "type": "node",
      "id": 6379379073,
      "lat": 31.6767561,
      "lon": 34.6128402
    },
    {
      "type": "node",
      "id": 6379379079,
      "lat": 31.676325,
      "lon": 34.6109485
    },
    {
      "type": "node",
      "id": 6379379084,
      "lat": 31.6761562,
      "lon": 34.6101911
    },
    {
      "type": "node",
      "id": 6379379085,
      "lat": 31.6761458,
      "lon": 34.6100066
    },
    {
      "type": "node",
      "id": 6379379089,
      "lat": 31.6761582,
      "lon": 34.6097723
    },
    {
      "type": "node",
      "id": 6379379124,
      "lat": 31.6760369,
      "lon": 34.6098729
    },
    {
      "type": "node",
      "id": 6379379152,
      "lat": 31.6760882,
      "lon": 34.6103718
    },
    {
      "type": "node",
      "id": 6379379153,
      "lat": 31.6761737,
      "lon": 34.6107494
    },
    {
      "type": "node",
      "id": 6379379154,
      "lat": 31.6763779,
      "lon": 34.6116864
    },
    {
      "type": "node",
      "id": 6379379156,
      "lat": 31.6765176,
      "lon": 34.6122925
    },
    {
      "type": "node",
      "id": 6708630389,
      "lat": 31.6893808,
      "lon": 34.5940546
    },
    {
      "type": "node",
      "id": 6708630390,
      "lat": 31.6894748,
      "lon": 34.5938876
    },
    {
      "type": "node",
      "id": 6708630391,
      "lat": 31.6892611,
      "lon": 34.5938299
    },
    {
      "type": "node",
      "id": 6708630392,
      "lat": 31.6894005,
      "lon": 34.5937839
    },
    {
      "type": "node",
      "id": 6708630393,
      "lat": 31.6892457,
      "lon": 34.5938612
    },
    {
      "type": "node",
      "id": 6708630394,
      "lat": 31.6892672,
      "lon": 34.5940105
    },
    {
      "type": "node",
      "id": 6708630395,
      "lat": 31.6892375,
      "lon": 34.5938961
    },
    {
      "type": "node",
      "id": 6708630396,
      "lat": 31.689247,
      "lon": 34.5939741
    },
    {
      "type": "node",
      "id": 6708630397,
      "lat": 31.6892909,
      "lon": 34.5940344
    },
    {
      "type": "node",
      "id": 6708630398,
      "lat": 31.6893191,
      "lon": 34.5940503
    },
    {
      "type": "node",
      "id": 6708630403,
      "lat": 31.6883572,
      "lon": 34.5935558
    },
    {
      "type": "node",
      "id": 6708630404,
      "lat": 31.6881671,
      "lon": 34.5934726
    },
    {
      "type": "node",
      "id": 6708630405,
      "lat": 31.6892827,
      "lon": 34.5938042
    },
    {
      "type": "node",
      "id": 6708630406,
      "lat": 31.6841001,
      "lon": 34.5916344
    },
    {
      "type": "node",
      "id": 6708630407,
      "lat": 31.6840898,
      "lon": 34.5916731
    },
    {
      "type": "node",
      "id": 6708630408,
      "lat": 31.6840711,
      "lon": 34.591707
    },
    {
      "type": "node",
      "id": 6708630409,
      "lat": 31.6894404,
      "lon": 34.5940178
    },
    {
      "type": "node",
      "id": 6708630410,
      "lat": 31.6840131,
      "lon": 34.5917517
    },
    {
      "type": "node",
      "id": 6708630411,
      "lat": 31.6883744,
      "lon": 34.5933581
    },
    {
      "type": "node",
      "id": 6708630412,
      "lat": 31.6883901,
      "lon": 34.5933869
    },
    {
      "type": "node",
      "id": 6708630413,
      "lat": 31.6882028,
      "lon": 34.5933454
    },
    {
      "type": "node",
      "id": 6708630414,
      "lat": 31.6839781,
      "lon": 34.5917584
    },
    {
      "type": "node",
      "id": 6708630415,
      "lat": 31.6892371,
      "lon": 34.5939323
    },
    {
      "type": "node",
      "id": 6708630416,
      "lat": 31.6839105,
      "lon": 34.5917372
    },
    {
      "type": "node",
      "id": 6708630417,
      "lat": 31.6883531,
      "lon": 34.5933347
    },
    {
      "type": "node",
      "id": 6708630418,
      "lat": 31.6838832,
      "lon": 34.5917113
    },
    {
      "type": "node",
      "id": 6708630420,
      "lat": 31.6838631,
      "lon": 34.5916774
    },
    {
      "type": "node",
      "id": 6708630422,
      "lat": 31.6838495,
      "lon": 34.5916019
    },
    {
      "type": "node",
      "id": 6708630423,
      "lat": 31.6838551,
      "lon": 34.5915658
    },
    {
      "type": "node",
      "id": 6708630424,
      "lat": 31.6883276,
      "lon": 34.5933181
    },
    {
      "type": "node",
      "id": 6708630427,
      "lat": 31.683868,
      "lon": 34.5915324
    },
    {
      "type": "node",
      "id": 6708630428,
      "lat": 31.6839205,
      "lon": 34.5914766
    },
    {
      "type": "node",
      "id": 6708630429,
      "lat": 31.6839593,
      "lon": 34.591463
    },
    {
      "type": "node",
      "id": 6708630431,
      "lat": 31.6840684,
      "lon": 34.5915096
    },
    {
      "type": "node",
      "id": 6708630433,
      "lat": 31.6840371,
      "lon": 34.5914806
    },
    {
      "type": "node",
      "id": 6708630434,
      "lat": 31.6840905,
      "lon": 34.5915487
    },
    {
      "type": "node",
      "id": 6708630436,
      "lat": 31.6838516,
      "lon": 34.5916384
    },
    {
      "type": "node",
      "id": 6708630438,
      "lat": 31.6838875,
      "lon": 34.5915038
    },
    {
      "type": "node",
      "id": 6708630440,
      "lat": 31.684101,
      "lon": 34.591594
    },
    {
      "type": "node",
      "id": 6708630442,
      "lat": 31.6840452,
      "lon": 34.5917338
    },
    {
      "type": "node",
      "id": 6708630443,
      "lat": 31.6839429,
      "lon": 34.5917534
    },
    {
      "type": "node",
      "id": 6708630444,
      "lat": 31.6840137,
      "lon": 34.5914664
    },
    {
      "type": "node",
      "id": 6708630447,
      "lat": 31.6893192,
      "lon": 34.5937813
    },
    {
      "type": "node",
      "id": 6708630448,
      "lat": 31.68936,
      "lon": 34.5937743
    },
    {
      "type": "node",
      "id": 6708630449,
      "lat": 31.6894269,
      "lon": 34.5938007
    },
    {
      "type": "node",
      "id": 6708630450,
      "lat": 31.6894489,
      "lon": 34.5938246
    },
    {
      "type": "node",
      "id": 6708630451,
      "lat": 31.6894653,
      "lon": 34.5938542
    },
    {
      "type": "node",
      "id": 6708630452,
      "lat": 31.6884015,
      "lon": 34.5934574
    },
    {
      "type": "node",
      "id": 6708630453,
      "lat": 31.6883947,
      "lon": 34.5934946
    },
    {
      "type": "node",
      "id": 6708630455,
      "lat": 31.6883795,
      "lon": 34.5935283
    },
    {
      "type": "node",
      "id": 6708630456,
      "lat": 31.6883245,
      "lon": 34.5935775
    },
    {
      "type": "node",
      "id": 6708630459,
      "lat": 31.6882877,
      "lon": 34.5935861
    },
    {
      "type": "node",
      "id": 6708630461,
      "lat": 31.6882207,
      "lon": 34.593565
    },
    {
      "type": "node",
      "id": 6708630462,
      "lat": 31.6881958,
      "lon": 34.5935405
    },
    {
      "type": "node",
      "id": 6708630463,
      "lat": 31.6881774,
      "lon": 34.5935089
    },
    {
      "type": "node",
      "id": 6708630464,
      "lat": 31.6910548,
      "lon": 34.5947906
    },
    {
      "type": "node",
      "id": 6708630465,
      "lat": 31.6881654,
      "lon": 34.5934378
    },
    {
      "type": "node",
      "id": 6708630467,
      "lat": 31.6882618,
      "lon": 34.5933104
    },
    {
      "type": "node",
      "id": 6708630469,
      "lat": 31.6882952,
      "lon": 34.5933087
    },
    {
      "type": "node",
      "id": 6708630470,
      "lat": 31.6910309,
      "lon": 34.5945289
    },
    {
      "type": "node",
      "id": 6708630471,
      "lat": 31.6881711,
      "lon": 34.5934036
    },
    {
      "type": "node",
      "id": 6708630472,
      "lat": 31.6881838,
      "lon": 34.5933721
    },
    {
      "type": "node",
      "id": 6708630474,
      "lat": 31.6894771,
      "lon": 34.593923
    },
    {
      "type": "node",
      "id": 6708630475,
      "lat": 31.6909776,
      "lon": 34.594682
    },
    {
      "type": "node",
      "id": 6708630482,
      "lat": 31.6883994,
      "lon": 34.5934194
    },
    {
      "type": "node",
      "id": 6708673589,
      "lat": 31.6894718,
      "lon": 34.5939579
    },
    {
      "type": "node",
      "id": 6708673591,
      "lat": 31.6882504,
      "lon": 34.5935806
    },
    {
      "type": "node",
      "id": 6708673595,
      "lat": 31.6894593,
      "lon": 34.5939902
    },
    {
      "type": "node",
      "id": 6708673598,
      "lat": 31.6894128,
      "lon": 34.5940412
    },
    {
      "type": "node",
      "id": 6708673601,
      "lat": 31.6893497,
      "lon": 34.5940572
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
      "id": 6708696520,
      "lat": 31.6882657,
      "lon": 34.5978681
    },
    {
      "type": "node",
      "id": 6708696521,
      "lat": 31.6827778,
      "lon": 34.5956953
    },
    {
      "type": "node",
      "id": 6708696522,
      "lat": 31.6887239,
      "lon": 34.6023845
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
      "id": 6708696536,
      "lat": 31.6887767,
      "lon": 34.6022366
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
      "id": 6708696539,
      "lat": 31.6882627,
      "lon": 34.5979143
    },
    {
      "type": "node",
      "id": 6708696540,
      "lat": 31.6882494,
      "lon": 34.5979578
    },
    {
      "type": "node",
      "id": 6708696541,
      "lat": 31.6881993,
      "lon": 34.5980224
    },
    {
      "type": "node",
      "id": 6708696542,
      "lat": 31.6881673,
      "lon": 34.5980406
    },
    {
      "type": "node",
      "id": 6708696543,
      "lat": 31.6817464,
      "lon": 34.6027662
    },
    {
      "type": "node",
      "id": 6708696544,
      "lat": 31.6880572,
      "lon": 34.5980331
    },
    {
      "type": "node",
      "id": 6708696545,
      "lat": 31.6880031,
      "lon": 34.5979808
    },
    {
      "type": "node",
      "id": 6708696546,
      "lat": 31.6812571,
      "lon": 34.6024699
    },
    {
      "type": "node",
      "id": 6708696547,
      "lat": 31.687987,
      "lon": 34.5979484
    },
    {
      "type": "node",
      "id": 6708696548,
      "lat": 31.6811427,
      "lon": 34.6023184
    },
    {
      "type": "node",
      "id": 6708696549,
      "lat": 31.6879752,
      "lon": 34.5978587
    },
    {
      "type": "node",
      "id": 6708696550,
      "lat": 31.6880939,
      "lon": 34.598047
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
      "id": 6708696555,
      "lat": 31.6879876,
      "lon": 34.5978067
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
      "id": 6708696559,
      "lat": 31.6880622,
      "lon": 34.5977211
    },
    {
      "type": "node",
      "id": 6708696560,
      "lat": 31.6882228,
      "lon": 34.5977566
    },
    {
      "type": "node",
      "id": 6708696561,
      "lat": 31.6882593,
      "lon": 34.5978272
    },
    {
      "type": "node",
      "id": 6708696562,
      "lat": 31.688184,
      "lon": 34.5977243
    },
    {
      "type": "node",
      "id": 6708696563,
      "lat": 31.6880249,
      "lon": 34.5980083
    },
    {
      "type": "node",
      "id": 6708696564,
      "lat": 31.6880359,
      "lon": 34.5977385
    },
    {
      "type": "node",
      "id": 6708696565,
      "lat": 31.688091,
      "lon": 34.5977104
    },
    {
      "type": "node",
      "id": 6708696566,
      "lat": 31.6881385,
      "lon": 34.5977083
    },
    {
      "type": "node",
      "id": 6708696568,
      "lat": 31.6828678,
      "lon": 34.5954895
    },
    {
      "type": "node",
      "id": 6708696569,
      "lat": 31.6882447,
      "lon": 34.5977893
    },
    {
      "type": "node",
      "id": 6708696570,
      "lat": 31.6882265,
      "lon": 34.5979956
    },
    {
      "type": "node",
      "id": 6708696571,
      "lat": 31.6879772,
      "lon": 34.5979126
    },
    {
      "type": "node",
      "id": 6708696572,
      "lat": 31.6881325,
      "lon": 34.5980492
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
      "id": 6708696576,
      "lat": 31.6887239,
      "lon": 34.6021438
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
      "id": 6708709686,
      "lat": 31.6887484,
      "lon": 34.6021689
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
      "id": 6708709696,
      "lat": 31.6886068,
      "lon": 34.602132
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
      "id": 6708709701,
      "lat": 31.6886462,
      "lon": 34.6021203
    },
    {
      "type": "node",
      "id": 6708709702,
      "lat": 31.6869579,
      "lon": 34.6016741
    },
    {
      "type": "node",
      "id": 6708709703,
      "lat": 31.6886173,
      "lon": 34.6024011
    },
    {
      "type": "node",
      "id": 6708709704,
      "lat": 31.6886868,
      "lon": 34.6021244
    },
    {
      "type": "node",
      "id": 6708709705,
      "lat": 31.6887664,
      "lon": 34.6022005
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
      "id": 6708709711,
      "lat": 31.6887783,
      "lon": 34.602279
    },
    {
      "type": "node",
      "id": 6708709712,
      "lat": 31.6828795,
      "lon": 34.595562
    },
    {
      "type": "node",
      "id": 6708709713,
      "lat": 31.6887507,
      "lon": 34.6023562
    },
    {
      "type": "node",
      "id": 6708709714,
      "lat": 31.6868784,
      "lon": 34.6016135
    },
    {
      "type": "node",
      "id": 6708709715,
      "lat": 31.6886904,
      "lon": 34.6024028
    },
    {
      "type": "node",
      "id": 6708709716,
      "lat": 31.6885394,
      "lon": 34.6022193
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
      "id": 6708709720,
      "lat": 31.6885527,
      "lon": 34.6021862
    },
    {
      "type": "node",
      "id": 6708709721,
      "lat": 31.6810661,
      "lon": 34.6015843
    },
    {
      "type": "node",
      "id": 6708709722,
      "lat": 31.6885727,
      "lon": 34.6021582
    },
    {
      "type": "node",
      "id": 6708709723,
      "lat": 31.6886538,
      "lon": 34.6024085
    },
    {
      "type": "node",
      "id": 6708709724,
      "lat": 31.6887694,
      "lon": 34.60232
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
      "id": 6708709727,
      "lat": 31.6885459,
      "lon": 34.6023278
    },
    {
      "type": "node",
      "id": 6708709728,
      "lat": 31.6885882,
      "lon": 34.6023845
    },
    {
      "type": "node",
      "id": 6708709729,
      "lat": 31.6870986,
      "lon": 34.6015169
    },
    {
      "type": "node",
      "id": 6708709730,
      "lat": 31.6885638,
      "lon": 34.6023594
    },
    {
      "type": "node",
      "id": 6708709732,
      "lat": 31.6885335,
      "lon": 34.6022552
    },
    {
      "type": "node",
      "id": 7133171700,
      "lat": 31.6870837,
      "lon": 34.5907958
    },
    {
      "type": "node",
      "id": 7133171701,
      "lat": 31.6869257,
      "lon": 34.5906694
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
      "id": 7169205395,
      "lat": 31.6948868,
      "lon": 34.6145552
    },
    {
      "type": "node",
      "id": 7169205399,
      "lat": 31.6933742,
      "lon": 34.6140739
    },
    {
      "type": "node",
      "id": 7169205401,
      "lat": 31.6946997,
      "lon": 34.6144845
    },
    {
      "type": "node",
      "id": 7169205402,
      "lat": 31.6950836,
      "lon": 34.6146296
    },
    {
      "type": "node",
      "id": 7169205433,
      "lat": 31.699182,
      "lon": 34.6174635
    },
    {
      "type": "node",
      "id": 7169205442,
      "lat": 31.6954039,
      "lon": 34.6147856
    },
    {
      "type": "node",
      "id": 7169205459,
      "lat": 31.6954538,
      "lon": 34.6148124
    },
    {
      "type": "node",
      "id": 7169205460,
      "lat": 31.698431,
      "lon": 34.6167187
    },
    {
      "type": "node",
      "id": 7169205461,
      "lat": 31.6958147,
      "lon": 34.6150332
    },
    {
      "type": "node",
      "id": 7169205462,
      "lat": 31.6953249,
      "lon": 34.6147432
    },
    {
      "type": "node",
      "id": 7169205468,
      "lat": 31.6933318,
      "lon": 34.6142662
    },
    {
      "type": "node",
      "id": 7169205475,
      "lat": 31.6944381,
      "lon": 34.6145865
    },
    {
      "type": "node",
      "id": 7169205480,
      "lat": 31.6946384,
      "lon": 34.6146515
    },
    {
      "type": "node",
      "id": 7169205488,
      "lat": 31.6952167,
      "lon": 34.6148966
    },
    {
      "type": "node",
      "id": 7169205489,
      "lat": 31.695451,
      "lon": 34.6150183
    },
    {
      "type": "node",
      "id": 7169205495,
      "lat": 31.6957438,
      "lon": 34.6151894
    },
    {
      "type": "node",
      "id": 7169205507,
      "lat": 31.698357,
      "lon": 34.6168729
    },
    {
      "type": "node",
      "id": 7169205510,
      "lat": 31.6986975,
      "lon": 34.6171052
    },
    {
      "type": "node",
      "id": 7169205521,
      "lat": 31.6990171,
      "lon": 34.6173385
    },
    {
      "type": "node",
      "id": 7169205566,
      "lat": 31.6985854,
      "lon": 34.616824
    },
    {
      "type": "node",
      "id": 7171772627,
      "lat": 31.6949551,
      "lon": 34.6147774
    },
    {
      "type": "node",
      "id": 7184277084,
      "lat": 31.6827136,
      "lon": 34.5885231
    },
    {
      "type": "node",
      "id": 7184294485,
      "lat": 31.682609,
      "lon": 34.5885038
    },
    {
      "type": "node",
      "id": 7591402464,
      "lat": 31.6828096,
      "lon": 34.5956832
    },
    {
      "type": "node",
      "id": 7740501652,
      "lat": 31.6757182,
      "lon": 34.5880853
    },
    {
      "type": "node",
      "id": 7806423680,
      "lat": 31.6760732,
      "lon": 34.5977771
    },
    {
      "type": "node",
      "id": 7806423681,
      "lat": 31.6758256,
      "lon": 34.5977785
    },
    {
      "type": "node",
      "id": 7806423683,
      "lat": 31.676367,
      "lon": 34.5976181
    },
    {
      "type": "node",
      "id": 7806423684,
      "lat": 31.6763425,
      "lon": 34.5975698
    },
    {
      "type": "node",
      "id": 7806430485,
      "lat": 31.6766125,
      "lon": 34.5975876
    },
    {
      "type": "node",
      "id": 7806430486,
      "lat": 31.6764713,
      "lon": 34.5976683
    },
    {
      "type": "node",
      "id": 7806430487,
      "lat": 31.6763528,
      "lon": 34.5977914
    },
    {
      "type": "node",
      "id": 8594513620,
      "lat": 31.6777911,
      "lon": 34.6050444
    },
    {
      "type": "node",
      "id": 8594513631,
      "lat": 31.6776768,
      "lon": 34.6052365
    },
    {
      "type": "node",
      "id": 8941616585,
      "lat": 31.6834402,
      "lon": 34.6059351
    },
    {
      "type": "node",
      "id": 8941616586,
      "lat": 31.6885669,
      "lon": 34.6114293
    },
    {
      "type": "node",
      "id": 8941616589,
      "lat": 31.6848192,
      "lon": 34.6090582
    },
    {
      "type": "node",
      "id": 8941616590,
      "lat": 31.6765875,
      "lon": 34.6088922
    },
    {
      "type": "node",
      "id": 8941616591,
      "lat": 31.6846114,
      "lon": 34.6090671
    },
    {
      "type": "node",
      "id": 8941616593,
      "lat": 31.6844348,
      "lon": 34.6090594
    },
    {
      "type": "node",
      "id": 8941616598,
      "lat": 31.6774333,
      "lon": 34.6070455
    },
    {
      "type": "node",
      "id": 8941616599,
      "lat": 31.6772932,
      "lon": 34.6079479
    },
    {
      "type": "node",
      "id": 8941616600,
      "lat": 31.6836222,
      "lon": 34.6060238
    },
    {
      "type": "node",
      "id": 8941616601,
      "lat": 31.6823795,
      "lon": 34.605965
    },
    {
      "type": "node",
      "id": 8941616602,
      "lat": 31.6819116,
      "lon": 34.6064163
    },
    {
      "type": "node",
      "id": 8941616603,
      "lat": 31.6847194,
      "lon": 34.6064257
    },
    {
      "type": "node",
      "id": 8941616605,
      "lat": 31.6845325,
      "lon": 34.6063554
    },
    {
      "type": "node",
      "id": 8941616606,
      "lat": 31.6765664,
      "lon": 34.6089291
    },
    {
      "type": "node",
      "id": 8941616607,
      "lat": 31.6764581,
      "lon": 34.6089545
    },
    {
      "type": "node",
      "id": 8941616608,
      "lat": 31.6774666,
      "lon": 34.6067922
    },
    {
      "type": "node",
      "id": 8941616609,
      "lat": 31.6846234,
      "lon": 34.6066784
    },
    {
      "type": "node",
      "id": 8941616610,
      "lat": 31.6848226,
      "lon": 34.6091669
    },
    {
      "type": "node",
      "id": 8941616611,
      "lat": 31.6782456,
      "lon": 34.6080702
    },
    {
      "type": "node",
      "id": 8941616612,
      "lat": 31.6857104,
      "lon": 34.6098005
    },
    {
      "type": "node",
      "id": 8941616613,
      "lat": 31.6866949,
      "lon": 34.6085073
    },
    {
      "type": "node",
      "id": 8941616614,
      "lat": 31.683731,
      "lon": 34.6060319
    },
    {
      "type": "node",
      "id": 8941616615,
      "lat": 31.6765891,
      "lon": 34.6088809
    },
    {
      "type": "node",
      "id": 8941616616,
      "lat": 31.6849657,
      "lon": 34.606646
    },
    {
      "type": "node",
      "id": 8941632917,
      "lat": 31.6861572,
      "lon": 34.6081624
    },
    {
      "type": "node",
      "id": 8941632918,
      "lat": 31.6862433,
      "lon": 34.6081196
    },
    {
      "type": "node",
      "id": 8941632919,
      "lat": 31.6764957,
      "lon": 34.6087315
    },
    {
      "type": "node",
      "id": 8941632921,
      "lat": 31.677416,
      "lon": 34.6078845
    },
    {
      "type": "node",
      "id": 8941632922,
      "lat": 31.6913212,
      "lon": 34.6128259
    },
    {
      "type": "node",
      "id": 8941632923,
      "lat": 31.6898481,
      "lon": 34.6121036
    },
    {
      "type": "node",
      "id": 8941632924,
      "lat": 31.6772575,
      "lon": 34.6081357
    },
    {
      "type": "node",
      "id": 8941632925,
      "lat": 31.6858219,
      "lon": 34.6099206
    },
    {
      "type": "node",
      "id": 8941632926,
      "lat": 31.6821238,
      "lon": 34.607427
    },
    {
      "type": "node",
      "id": 8941632927,
      "lat": 31.6818317,
      "lon": 34.6064835
    },
    {
      "type": "node",
      "id": 8941632932,
      "lat": 31.6823189,
      "lon": 34.6079754
    },
    {
      "type": "node",
      "id": 8941632934,
      "lat": 31.6817893,
      "lon": 34.6063881
    },
    {
      "type": "node",
      "id": 8941632936,
      "lat": 31.682245,
      "lon": 34.6077939
    },
    {
      "type": "node",
      "id": 8941632937,
      "lat": 31.6835139,
      "lon": 34.6060636
    },
    {
      "type": "node",
      "id": 8941632938,
      "lat": 31.676426,
      "lon": 34.6087658
    },
    {
      "type": "node",
      "id": 8941632939,
      "lat": 31.6838067,
      "lon": 34.6070047
    },
    {
      "type": "node",
      "id": 8941632940,
      "lat": 31.6853226,
      "lon": 34.6091317
    },
    {
      "type": "node",
      "id": 8941632941,
      "lat": 31.6853623,
      "lon": 34.6091621
    },
    {
      "type": "node",
      "id": 8941632942,
      "lat": 31.6846355,
      "lon": 34.6064462
    },
    {
      "type": "node",
      "id": 8941632944,
      "lat": 31.6836891,
      "lon": 34.6089282
    },
    {
      "type": "node",
      "id": 8941632945,
      "lat": 31.6766731,
      "lon": 34.6088722
    },
    {
      "type": "node",
      "id": 8941632946,
      "lat": 31.676814,
      "lon": 34.6088398
    },
    {
      "type": "node",
      "id": 8941632947,
      "lat": 31.6772524,
      "lon": 34.6084316
    },
    {
      "type": "node",
      "id": 8941632948,
      "lat": 31.6833845,
      "lon": 34.6059627
    },
    {
      "type": "node",
      "id": 8941632950,
      "lat": 31.6842482,
      "lon": 34.607017
    },
    {
      "type": "node",
      "id": 8941632951,
      "lat": 31.6834395,
      "lon": 34.6065412
    },
    {
      "type": "node",
      "id": 8941632952,
      "lat": 31.6845721,
      "lon": 34.6067631
    },
    {
      "type": "node",
      "id": 8941632953,
      "lat": 31.6764967,
      "lon": 34.6089634
    },
    {
      "type": "node",
      "id": 8941632954,
      "lat": 31.6765352,
      "lon": 34.608954
    },
    {
      "type": "node",
      "id": 8941632955,
      "lat": 31.6863572,
      "lon": 34.6083182
    },
    {
      "type": "node",
      "id": 8941632956,
      "lat": 31.6855245,
      "lon": 34.6090088
    },
    {
      "type": "node",
      "id": 8941632957,
      "lat": 31.686291,
      "lon": 34.6083956
    },
    {
      "type": "node",
      "id": 8941632958,
      "lat": 31.6771692,
      "lon": 34.6083541
    },
    {
      "type": "node",
      "id": 8941632959,
      "lat": 31.6861963,
      "lon": 34.6081311
    },
    {
      "type": "node",
      "id": 8941632960,
      "lat": 31.677044,
      "lon": 34.6085375
    },
    {
      "type": "node",
      "id": 8941632961,
      "lat": 31.6846603,
      "lon": 34.6064265
    },
    {
      "type": "node",
      "id": 8941632962,
      "lat": 31.6863309,
      "lon": 34.6083643
    },
    {
      "type": "node",
      "id": 8941632963,
      "lat": 31.6862897,
      "lon": 34.6081299
    },
    {
      "type": "node",
      "id": 8941632964,
      "lat": 31.693258,
      "lon": 34.6134961
    },
    {
      "type": "node",
      "id": 8941632965,
      "lat": 31.6933466,
      "lon": 34.6134477
    },
    {
      "type": "node",
      "id": 8941632966,
      "lat": 31.685682,
      "lon": 34.6074044
    },
    {
      "type": "node",
      "id": 8941632967,
      "lat": 31.6931919,
      "lon": 34.6135104
    },
    {
      "type": "node",
      "id": 8941632968,
      "lat": 31.6834702,
      "lon": 34.6059417
    },
    {
      "type": "node",
      "id": 8941632970,
      "lat": 31.6839252,
      "lon": 34.607038
    },
    {
      "type": "node",
      "id": 8941632971,
      "lat": 31.6854918,
      "lon": 34.6089294
    },
    {
      "type": "node",
      "id": 8941632972,
      "lat": 31.6869368,
      "lon": 34.6105688
    },
    {
      "type": "node",
      "id": 8941632975,
      "lat": 31.6818742,
      "lon": 34.6061841
    },
    {
      "type": "node",
      "id": 8941632977,
      "lat": 31.6846364,
      "lon": 34.6065748
    },
    {
      "type": "node",
      "id": 8941632978,
      "lat": 31.6855282,
      "lon": 34.6090291
    },
    {
      "type": "node",
      "id": 8941632980,
      "lat": 31.6834039,
      "lon": 34.6062959
    },
    {
      "type": "node",
      "id": 8941632981,
      "lat": 31.6835136,
      "lon": 34.6059913
    },
    {
      "type": "node",
      "id": 8941632982,
      "lat": 31.6764049,
      "lon": 34.6088027
    },
    {
      "type": "node",
      "id": 8941632983,
      "lat": 31.6861308,
      "lon": 34.6082094
    },
    {
      "type": "node",
      "id": 8941632984,
      "lat": 31.683471,
      "lon": 34.6061137
    },
    {
      "type": "node",
      "id": 8941632985,
      "lat": 31.6855183,
      "lon": 34.6089747
    },
    {
      "type": "node",
      "id": 8941632986,
      "lat": 31.6822101,
      "lon": 34.6073876
    },
    {
      "type": "node",
      "id": 8941632988,
      "lat": 31.6823313,
      "lon": 34.6077545
    },
    {
      "type": "node",
      "id": 8941632989,
      "lat": 31.6823967,
      "lon": 34.6079165
    },
    {
      "type": "node",
      "id": 8941632990,
      "lat": 31.6852951,
      "lon": 34.6089776
    },
    {
      "type": "node",
      "id": 8941632992,
      "lat": 31.6772994,
      "lon": 34.6083407
    },
    {
      "type": "node",
      "id": 8941632994,
      "lat": 31.6768967,
      "lon": 34.608799
    },
    {
      "type": "node",
      "id": 8941632995,
      "lat": 31.6861313,
      "lon": 34.6083181
    },
    {
      "type": "node",
      "id": 8941632996,
      "lat": 31.6763971,
      "lon": 34.608848
    },
    {
      "type": "node",
      "id": 8941632997,
      "lat": 31.6934981,
      "lon": 34.6127897
    },
    {
      "type": "node",
      "id": 8941632998,
      "lat": 31.6861581,
      "lon": 34.6083648
    },
    {
      "type": "node",
      "id": 8941632999,
      "lat": 31.6861975,
      "lon": 34.6083955
    },
    {
      "type": "node",
      "id": 8941633000,
      "lat": 31.6861218,
      "lon": 34.6082645
    },
    {
      "type": "node",
      "id": 8941633001,
      "lat": 31.6764047,
      "lon": 34.6088917
    },
    {
      "type": "node",
      "id": 8941633002,
      "lat": 31.6764266,
      "lon": 34.6089299
    },
    {
      "type": "node",
      "id": 8941633003,
      "lat": 31.6862446,
      "lon": 34.6084064
    },
    {
      "type": "node",
      "id": 8941633004,
      "lat": 31.6855463,
      "lon": 34.6094829
    },
    {
      "type": "node",
      "id": 8941633005,
      "lat": 31.6856247,
      "lon": 34.6096713
    },
    {
      "type": "node",
      "id": 8941633006,
      "lat": 31.6834702,
      "lon": 34.6089935
    },
    {
      "type": "node",
      "id": 8941633007,
      "lat": 31.683675,
      "lon": 34.6090356
    },
    {
      "type": "node",
      "id": 8941633008,
      "lat": 31.6842468,
      "lon": 34.6091393
    },
    {
      "type": "node",
      "id": 8941633009,
      "lat": 31.6834105,
      "lon": 34.6061137
    },
    {
      "type": "node",
      "id": 8941633010,
      "lat": 31.68469,
      "lon": 34.6064192
    },
    {
      "type": "node",
      "id": 8941633011,
      "lat": 31.6934402,
      "lon": 34.6127274
    },
    {
      "type": "node",
      "id": 8941633012,
      "lat": 31.6916542,
      "lon": 34.6113908
    },
    {
      "type": "node",
      "id": 8941633013,
      "lat": 31.6863643,
      "lon": 34.6082486
    },
    {
      "type": "node",
      "id": 8941633014,
      "lat": 31.6844483,
      "lon": 34.6063018
    },
    {
      "type": "node",
      "id": 8941633015,
      "lat": 31.6853108,
      "lon": 34.6091115
    },
    {
      "type": "node",
      "id": 8941633016,
      "lat": 31.6833674,
      "lon": 34.6059933
    },
    {
      "type": "node",
      "id": 8941633018,
      "lat": 31.6875304,
      "lon": 34.609092
    },
    {
      "type": "node",
      "id": 8941633019,
      "lat": 31.6834969,
      "lon": 34.6060934
    },
    {
      "type": "node",
      "id": 8941633020,
      "lat": 31.6773896,
      "lon": 34.6080593
    },
    {
      "type": "node",
      "id": 8941633021,
      "lat": 31.6857251,
      "lon": 34.6088651
    },
    {
      "type": "node",
      "id": 8941633022,
      "lat": 31.6769879,
      "lon": 34.6087393
    },
    {
      "type": "node",
      "id": 8941633023,
      "lat": 31.6859825,
      "lon": 34.6086659
    },
    {
      "type": "node",
      "id": 8941633024,
      "lat": 31.677078,
      "lon": 34.6086619
    },
    {
      "type": "node",
      "id": 8941633025,
      "lat": 31.6773515,
      "lon": 34.6082119
    },
    {
      "type": "node",
      "id": 8941633026,
      "lat": 31.6771787,
      "lon": 34.6085479
    },
    {
      "type": "node",
      "id": 8941633027,
      "lat": 31.6863567,
      "lon": 34.6082065
    },
    {
      "type": "node",
      "id": 8941633028,
      "lat": 31.6855188,
      "lon": 34.609085
    },
    {
      "type": "node",
      "id": 8941633029,
      "lat": 31.6844639,
      "lon": 34.6068784
    },
    {
      "type": "node",
      "id": 8941633030,
      "lat": 31.6829349,
      "lon": 34.6087293
    },
    {
      "type": "node",
      "id": 8941633031,
      "lat": 31.6825777,
      "lon": 34.6083886
    },
    {
      "type": "node",
      "id": 8941633032,
      "lat": 31.6827606,
      "lon": 34.6085889
    },
    {
      "type": "node",
      "id": 8941633034,
      "lat": 31.682444,
      "lon": 34.6082021
    },
    {
      "type": "node",
      "id": 8941633035,
      "lat": 31.6846131,
      "lon": 34.6065109
    },
    {
      "type": "node",
      "id": 8941633036,
      "lat": 31.6772107,
      "lon": 34.6082657
    },
    {
      "type": "node",
      "id": 8941633037,
      "lat": 31.6935079,
      "lon": 34.6128139
    },
    {
      "type": "node",
      "id": 8941633038,
      "lat": 31.6833851,
      "lon": 34.6060938
    },
    {
      "type": "node",
      "id": 8941633039,
      "lat": 31.6768456,
      "lon": 34.6086873
    },
    {
      "type": "node",
      "id": 8941633040,
      "lat": 31.6767263,
      "lon": 34.608746
    },
    {
      "type": "node",
      "id": 8941633041,
      "lat": 31.6769389,
      "lon": 34.6086238
    },
    {
      "type": "node",
      "id": 8941633042,
      "lat": 31.6847682,
      "lon": 34.6065091
    },
    {
      "type": "node",
      "id": 8941633043,
      "lat": 31.6854533,
      "lon": 34.6091615
    },
    {
      "type": "node",
      "id": 8941633044,
      "lat": 31.6854082,
      "lon": 34.6091722
    },
    {
      "type": "node",
      "id": 8941633045,
      "lat": 31.6859343,
      "lon": 34.6100118
    },
    {
      "type": "node",
      "id": 8941633046,
      "lat": 31.6835201,
      "lon": 34.606027
    },
    {
      "type": "node",
      "id": 8941633047,
      "lat": 31.6841342,
      "lon": 34.6070454
    },
    {
      "type": "node",
      "id": 8941633048,
      "lat": 31.6835461,
      "lon": 34.6067823
    },
    {
      "type": "node",
      "id": 8941633049,
      "lat": 31.6861405,
      "lon": 34.6101314
    },
    {
      "type": "node",
      "id": 8941633050,
      "lat": 31.6854062,
      "lon": 34.6088889
    },
    {
      "type": "node",
      "id": 8941633051,
      "lat": 31.6834907,
      "lon": 34.6066794
    },
    {
      "type": "node",
      "id": 8941633052,
      "lat": 31.6853212,
      "lon": 34.6089311
    },
    {
      "type": "node",
      "id": 8941633053,
      "lat": 31.6853598,
      "lon": 34.6089002
    },
    {
      "type": "node",
      "id": 8941633054,
      "lat": 31.6854928,
      "lon": 34.6091306
    },
    {
      "type": "node",
      "id": 8941633055,
      "lat": 31.6834233,
      "lon": 34.6061166
    },
    {
      "type": "node",
      "id": 8941633056,
      "lat": 31.684033,
      "lon": 34.6070536
    },
    {
      "type": "node",
      "id": 8941633057,
      "lat": 31.6935412,
      "lon": 34.6130397
    },
    {
      "type": "node",
      "id": 8941633058,
      "lat": 31.6861679,
      "lon": 34.6081538
    },
    {
      "type": "node",
      "id": 8941633059,
      "lat": 31.6935461,
      "lon": 34.6129327
    },
    {
      "type": "node",
      "id": 8941633060,
      "lat": 31.6935469,
      "lon": 34.6129736
    },
    {
      "type": "node",
      "id": 8941633061,
      "lat": 31.6833677,
      "lon": 34.6060635
    },
    {
      "type": "node",
      "id": 8941633062,
      "lat": 31.6833616,
      "lon": 34.6060288
    },
    {
      "type": "node",
      "id": 8941633063,
      "lat": 31.6847618,
      "lon": 34.6064742
    },
    {
      "type": "node",
      "id": 8941633064,
      "lat": 31.6765784,
      "lon": 34.6087871
    },
    {
      "type": "node",
      "id": 8941633065,
      "lat": 31.6860207,
      "lon": 34.6084638
    },
    {
      "type": "node",
      "id": 8941633066,
      "lat": 31.6853441,
      "lon": 34.6069861
    },
    {
      "type": "node",
      "id": 8941633067,
      "lat": 31.6915704,
      "lon": 34.6129276
    },
    {
      "type": "node",
      "id": 8941633068,
      "lat": 31.68509,
      "lon": 34.6067497
    },
    {
      "type": "node",
      "id": 8941633069,
      "lat": 31.6931327,
      "lon": 34.6135114
    },
    {
      "type": "node",
      "id": 8941633070,
      "lat": 31.6926792,
      "lon": 34.613355
    },
    {
      "type": "node",
      "id": 8941633071,
      "lat": 31.6930642,
      "lon": 34.6134955
    },
    {
      "type": "node",
      "id": 8941633072,
      "lat": 31.6935275,
      "lon": 34.6128597
    },
    {
      "type": "node",
      "id": 8941633073,
      "lat": 31.6855845,
      "lon": 34.6072741
    },
    {
      "type": "node",
      "id": 8941633074,
      "lat": 31.6846619,
      "lon": 34.6065943
    },
    {
      "type": "node",
      "id": 8941633075,
      "lat": 31.6863667,
      "lon": 34.6082616
    },
    {
      "type": "node",
      "id": 8941633076,
      "lat": 31.6765876,
      "lon": 34.6088033
    },
    {
      "type": "node",
      "id": 8941633077,
      "lat": 31.6765657,
      "lon": 34.6087651
    },
    {
      "type": "node",
      "id": 8941633078,
      "lat": 31.6846148,
      "lon": 34.6091758
    },
    {
      "type": "node",
      "id": 8941633079,
      "lat": 31.6935207,
      "lon": 34.6131274
    },
    {
      "type": "node",
      "id": 8941633081,
      "lat": 31.6933965,
      "lon": 34.6133964
    },
    {
      "type": "node",
      "id": 8941633082,
      "lat": 31.6934419,
      "lon": 34.6133243
    },
    {
      "type": "node",
      "id": 8941633083,
      "lat": 31.6847449,
      "lon": 34.6064452
    },
    {
      "type": "node",
      "id": 8941633084,
      "lat": 31.683164,
      "lon": 34.6087552
    },
    {
      "type": "node",
      "id": 8941633085,
      "lat": 31.6829868,
      "lon": 34.6086393
    },
    {
      "type": "node",
      "id": 8941633086,
      "lat": 31.6833345,
      "lon": 34.6088335
    },
    {
      "type": "node",
      "id": 8941633087,
      "lat": 31.6834962,
      "lon": 34.6088891
    },
    {
      "type": "node",
      "id": 8941633089,
      "lat": 31.6846195,
      "lon": 34.6065458
    },
    {
      "type": "node",
      "id": 8941633090,
      "lat": 31.6860933,
      "lon": 34.6085577
    },
    {
      "type": "node",
      "id": 8941633091,
      "lat": 31.6859254,
      "lon": 34.6085638
    },
    {
      "type": "node",
      "id": 8941633093,
      "lat": 31.6819701,
      "lon": 34.6059653
    },
    {
      "type": "node",
      "id": 8941633094,
      "lat": 31.6775795,
      "lon": 34.6067575
    },
    {
      "type": "node",
      "id": 8941633096,
      "lat": 31.6834963,
      "lon": 34.6059617
    },
    {
      "type": "node",
      "id": 8941633097,
      "lat": 31.6775264,
      "lon": 34.6071532
    },
    {
      "type": "node",
      "id": 8941633098,
      "lat": 31.6856679,
      "lon": 34.6087632
    },
    {
      "type": "node",
      "id": 8941633099,
      "lat": 31.6854521,
      "lon": 34.608899
    },
    {
      "type": "node",
      "id": 8941633100,
      "lat": 31.6869221,
      "lon": 34.6087325
    },
    {
      "type": "node",
      "id": 8941633101,
      "lat": 31.691415,
      "lon": 34.6112431
    },
    {
      "type": "node",
      "id": 8941633102,
      "lat": 31.6838938,
      "lon": 34.6060711
    },
    {
      "type": "node",
      "id": 8941633103,
      "lat": 31.6870409,
      "lon": 34.6088199
    },
    {
      "type": "node",
      "id": 8941633104,
      "lat": 31.6915694,
      "lon": 34.6113334
    },
    {
      "type": "node",
      "id": 8941633105,
      "lat": 31.6842681,
      "lon": 34.6062123
    },
    {
      "type": "node",
      "id": 8941633106,
      "lat": 31.6840879,
      "lon": 34.6061366
    },
    {
      "type": "node",
      "id": 8941633107,
      "lat": 31.684347,
      "lon": 34.6069685
    },
    {
      "type": "node",
      "id": 8941633108,
      "lat": 31.6846188,
      "lon": 34.6064761
    },
    {
      "type": "node",
      "id": 8941633109,
      "lat": 31.6847455,
      "lon": 34.6065741
    },
    {
      "type": "node",
      "id": 8941633110,
      "lat": 31.6833008,
      "lon": 34.6089348
    },
    {
      "type": "node",
      "id": 8941633111,
      "lat": 31.6831303,
      "lon": 34.6088565
    },
    {
      "type": "node",
      "id": 8941633112,
      "lat": 31.6834088,
      "lon": 34.6064255
    },
    {
      "type": "node",
      "id": 8941633114,
      "lat": 31.6831277,
      "lon": 34.6059413
    },
    {
      "type": "node",
      "id": 8941633118,
      "lat": 31.683258,
      "lon": 34.6059556
    },
    {
      "type": "node",
      "id": 8941633119,
      "lat": 31.682515,
      "lon": 34.6081323
    },
    {
      "type": "node",
      "id": 8941633120,
      "lat": 31.6847622,
      "lon": 34.6065449
    },
    {
      "type": "node",
      "id": 8941633121,
      "lat": 31.6765949,
      "lon": 34.6088427
    },
    {
      "type": "node",
      "id": 8941633122,
      "lat": 31.6828237,
      "lon": 34.6085094
    },
    {
      "type": "node",
      "id": 8941633123,
      "lat": 31.6834097,
      "lon": 34.6059426
    },
    {
      "type": "node",
      "id": 8941633124,
      "lat": 31.6862998,
      "lon": 34.6081376
    },
    {
      "type": "node",
      "id": 8941633125,
      "lat": 31.6826408,
      "lon": 34.6083091
    },
    {
      "type": "node",
      "id": 8941633126,
      "lat": 31.6816978,
      "lon": 34.6062354
    },
    {
      "type": "node",
      "id": 8941633128,
      "lat": 31.6764586,
      "lon": 34.6087402
    },
    {
      "type": "node",
      "id": 8941633129,
      "lat": 31.683623,
      "lon": 34.6068737
    },
    {
      "type": "node",
      "id": 8941633130,
      "lat": 31.6837127,
      "lon": 34.6069461
    },
    {
      "type": "node",
      "id": 8941633131,
      "lat": 31.6852863,
      "lon": 34.609032
    },
    {
      "type": "node",
      "id": 8941633132,
      "lat": 31.6852962,
      "lon": 34.6090864
    },
    {
      "type": "node",
      "id": 8941633133,
      "lat": 31.6844314,
      "lon": 34.6091681
    },
    {
      "type": "node",
      "id": 8941633135,
      "lat": 31.6765342,
      "lon": 34.6087405
    },
    {
      "type": "node",
      "id": 8941633136,
      "lat": 31.6834411,
      "lon": 34.6061207
    },
    {
      "type": "node",
      "id": 8941633137,
      "lat": 31.6863299,
      "lon": 34.6081607
    },
    {
      "type": "node",
      "id": 8941633138,
      "lat": 31.6846913,
      "lon": 34.6066008
    },
    {
      "type": "node",
      "id": 8941633139,
      "lat": 31.6847202,
      "lon": 34.6065939
    },
    {
      "type": "node",
      "id": 9163248164,
      "lat": 31.6867282,
      "lon": 34.5905003
    },
    {
      "type": "node",
      "id": 9163248165,
      "lat": 31.6872703,
      "lon": 34.5907257
    },
    {
      "type": "node",
      "id": 9743806904,
      "lat": 31.6795208,
      "lon": 34.6005591
    },
    {
      "type": "node",
      "id": 10160134445,
      "lat": 31.6766283,
      "lon": 34.5974319
    },
    {
      "type": "node",
      "id": 10160134446,
      "lat": 31.6768999,
      "lon": 34.5972683
    },
    {
      "type": "node",
      "id": 10160134447,
      "lat": 31.677151,
      "lon": 34.5970751
    },
    {
      "type": "node",
      "id": 10160134448,
      "lat": 31.6775356,
      "lon": 34.5967546
    },
    {
      "type": "node",
      "id": 10160134449,
      "lat": 31.677918,
      "lon": 34.596422
    },
    {
      "type": "node",
      "id": 10160134450,
      "lat": 31.6782181,
      "lon": 34.596186
    },
    {
      "type": "node",
      "id": 10160134451,
      "lat": 31.6770049,
      "lon": 34.5973796
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
      "id": 10160134454,
      "lat": 31.6772457,
      "lon": 34.5971985
    },
    {
      "type": "node",
      "id": 10160134455,
      "lat": 31.6776486,
      "lon": 34.5968512
    },
    {
      "type": "node",
      "id": 10160134456,
      "lat": 31.6782923,
      "lon": 34.5962919
    },
    {
      "type": "node",
      "id": 10160134457,
      "lat": 31.6784121,
      "lon": 34.5962021
    },
    {
      "type": "node",
      "id": 10160134458,
      "lat": 31.6785629,
      "lon": 34.5961028
    },
    {
      "type": "node",
      "id": 10160134459,
      "lat": 31.6789637,
      "lon": 34.5956182
    },
    {
      "type": "node",
      "id": 10160134460,
      "lat": 31.6784806,
      "lon": 34.5960143
    },
    {
      "type": "node",
      "id": 10160134461,
      "lat": 31.6785008,
      "lon": 34.5961437
    },
    {
      "type": "node",
      "id": 10160134463,
      "lat": 31.679353,
      "lon": 34.5954522
    },
    {
      "type": "node",
      "id": 10160134464,
      "lat": 31.6785595,
      "lon": 34.5955751
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
      "id": 10248959544,
      "lat": 31.6828624,
      "lon": 34.5877067
    },
    {
      "type": "node",
      "id": 10248959545,
      "lat": 31.6828789,
      "lon": 34.5876248
    },
    {
      "type": "node",
      "id": 10248959546,
      "lat": 31.6829654,
      "lon": 34.5877406
    },
    {
      "type": "node",
      "id": 10248959547,
      "lat": 31.6829842,
      "lon": 34.5876982
    },
    {
      "type": "node",
      "id": 10248959548,
      "lat": 31.6830118,
      "lon": 34.5876561
    },
    {
      "type": "node",
      "id": 10248959549,
      "lat": 31.6820091,
      "lon": 34.590368
    },
    {
      "type": "node",
      "id": 10248959550,
      "lat": 31.6821114,
      "lon": 34.5904022
    },
    {
      "type": "node",
      "id": 10248959551,
      "lat": 31.6820911,
      "lon": 34.5905137
    },
    {
      "type": "node",
      "id": 10982165617,
      "lat": 31.6785164,
      "lon": 34.5959306
    },
    {
      "type": "node",
      "id": 11157715991,
      "lat": 31.6766267,
      "lon": 34.5926577
    },
    {
      "type": "node",
      "id": 11157715997,
      "lat": 31.6763439,
      "lon": 34.5922943
    },
    {
      "type": "node",
      "id": 11180689013,
      "lat": 31.6809979,
      "lon": 34.5932995
    },
    {
      "type": "node",
      "id": 11180689014,
      "lat": 31.6810181,
      "lon": 34.5933464
    },
    {
      "type": "node",
      "id": 11180689015,
      "lat": 31.6810374,
      "lon": 34.5933918
    },
    {
      "type": "node",
      "id": 11180689016,
      "lat": 31.6810509,
      "lon": 34.5934338
    },
    {
      "type": "node",
      "id": 11180689017,
      "lat": 31.6810583,
      "lon": 34.5934659
    },
    {
      "type": "node",
      "id": 11180689018,
      "lat": 31.6810326,
      "lon": 34.5932942
    },
    {
      "type": "node",
      "id": 11180689019,
      "lat": 31.6810761,
      "lon": 34.5932783
    },
    {
      "type": "node",
      "id": 11180689020,
      "lat": 31.6811041,
      "lon": 34.5932612
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
      "id": 11180689024,
      "lat": 31.6811955,
      "lon": 34.5934849
    },
    {
      "type": "node",
      "id": 11180689025,
      "lat": 31.6812257,
      "lon": 34.5934676
    },
    {
      "type": "node",
      "id": 11180689026,
      "lat": 31.681265,
      "lon": 34.5934522
    },
    {
      "type": "node",
      "id": 11180689027,
      "lat": 31.6812896,
      "lon": 34.5934436
    },
    {
      "type": "node",
      "id": 11180689028,
      "lat": 31.681301,
      "lon": 34.5934099
    },
    {
      "type": "node",
      "id": 11180689029,
      "lat": 31.6812724,
      "lon": 34.5933647
    },
    {
      "type": "node",
      "id": 11180689030,
      "lat": 31.6812519,
      "lon": 34.5933215
    },
    {
      "type": "node",
      "id": 11180689031,
      "lat": 31.6812429,
      "lon": 34.593284
    },
    {
      "type": "node",
      "id": 11180689032,
      "lat": 31.6812364,
      "lon": 34.5932532
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
      "id": 11180761328,
      "lat": 31.6860774,
      "lon": 34.5925769
    },
    {
      "type": "node",
      "id": 11180761329,
      "lat": 31.6861342,
      "lon": 34.5926722
    },
    {
      "type": "node",
      "id": 11180761330,
      "lat": 31.6861683,
      "lon": 34.5927569
    },
    {
      "type": "node",
      "id": 11180761331,
      "lat": 31.6861788,
      "lon": 34.5928416
    },
    {
      "type": "node",
      "id": 11180761332,
      "lat": 31.6861814,
      "lon": 34.5929325
    },
    {
      "type": "node",
      "id": 11180761333,
      "lat": 31.686183,
      "lon": 34.5930449
    },
    {
      "type": "node",
      "id": 11180761334,
      "lat": 31.6864157,
      "lon": 34.5923015
    },
    {
      "type": "node",
      "id": 11180761335,
      "lat": 31.6863308,
      "lon": 34.5923872
    },
    {
      "type": "node",
      "id": 11180761336,
      "lat": 31.68626,
      "lon": 34.5924272
    },
    {
      "type": "node",
      "id": 11180770837,
      "lat": 31.6861853,
      "lon": 34.5924488
    },
    {
      "type": "node",
      "id": 11180770838,
      "lat": 31.6861337,
      "lon": 34.5924625
    },
    {
      "type": "node",
      "id": 11180770839,
      "lat": 31.6866775,
      "lon": 34.5926945
    },
    {
      "type": "node",
      "id": 11180770840,
      "lat": 31.6866376,
      "lon": 34.5926444
    },
    {
      "type": "node",
      "id": 11180770841,
      "lat": 31.6866048,
      "lon": 34.5925828
    },
    {
      "type": "node",
      "id": 11180770842,
      "lat": 31.6865904,
      "lon": 34.5925273
    },
    {
      "type": "node",
      "id": 11180770843,
      "lat": 31.6865865,
      "lon": 34.5924842
    },
    {
      "type": "node",
      "id": 11180770844,
      "lat": 31.686578,
      "lon": 34.5924396
    },
    {
      "type": "node",
      "id": 11180770845,
      "lat": 31.6864202,
      "lon": 34.5929452
    },
    {
      "type": "node",
      "id": 11180770846,
      "lat": 31.6864619,
      "lon": 34.5929094
    },
    {
      "type": "node",
      "id": 11180770847,
      "lat": 31.6865235,
      "lon": 34.5928632
    },
    {
      "type": "node",
      "id": 11180770848,
      "lat": 31.6865747,
      "lon": 34.5928339
    },
    {
      "type": "node",
      "id": 11180770849,
      "lat": 31.6866206,
      "lon": 34.5928096
    },
    {
      "type": "node",
      "id": 11235775791,
      "lat": 31.6812816,
      "lon": 34.5865522
    },
    {
      "type": "node",
      "id": 11236453114,
      "lat": 31.6882302,
      "lon": 34.5933229
    },
    {
      "type": "node",
      "id": 11236453115,
      "lat": 31.6809811,
      "lon": 34.5951644
    },
    {
      "type": "node",
      "id": 11341401056,
      "lat": 31.6863621,
      "lon": 34.589526
    },
    {
      "type": "node",
      "id": 11341401058,
      "lat": 31.6848518,
      "lon": 34.5888598
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
      "id": 11595790837,
      "lat": 31.6829787,
      "lon": 34.588891
    },
    {
      "type": "node",
      "id": 11595797184,
      "lat": 31.6828727,
      "lon": 34.5880288
    },
    {
      "type": "node",
      "id": 11595797186,
      "lat": 31.6842492,
      "lon": 34.5885763
    },
    {
      "type": "node",
      "id": 11595797189,
      "lat": 31.6829778,
      "lon": 34.5877127
    },
    {
      "type": "node",
      "id": 11595797190,
      "lat": 31.6828732,
      "lon": 34.5876656
    },
    {
      "type": "node",
      "id": 11595797191,
      "lat": 31.6827396,
      "lon": 34.5887838
    },
    {
      "type": "node",
      "id": 11595797192,
      "lat": 31.682679,
      "lon": 34.5886311
    },
    {
      "type": "node",
      "id": 11595797196,
      "lat": 31.6826089,
      "lon": 34.5888496
    },
    {
      "type": "node",
      "id": 11595797223,
      "lat": 31.683426,
      "lon": 34.5890802
    },
    {
      "type": "node",
      "id": 11595797259,
      "lat": 31.6834038,
      "lon": 34.591298
    },
    {
      "type": "node",
      "id": 11595797260,
      "lat": 31.6835061,
      "lon": 34.5913415
    },
    {
      "type": "node",
      "id": 11595797261,
      "lat": 31.6834839,
      "lon": 34.5912991
    },
    {
      "type": "node",
      "id": 11595797262,
      "lat": 31.683471,
      "lon": 34.591262
    },
    {
      "type": "node",
      "id": 11595797263,
      "lat": 31.6834564,
      "lon": 34.5912067
    },
    {
      "type": "node",
      "id": 11595797264,
      "lat": 31.6833961,
      "lon": 34.5911805
    },
    {
      "type": "node",
      "id": 11595797265,
      "lat": 31.6833712,
      "lon": 34.5912005
    },
    {
      "type": "node",
      "id": 11595797266,
      "lat": 31.6833476,
      "lon": 34.5912067
    },
    {
      "type": "node",
      "id": 11595797267,
      "lat": 31.6833279,
      "lon": 34.5912128
    },
    {
      "type": "node",
      "id": 11595797268,
      "lat": 31.6832991,
      "lon": 34.591219
    },
    {
      "type": "node",
      "id": 11595797269,
      "lat": 31.6832729,
      "lon": 34.5912175
    },
    {
      "type": "node",
      "id": 11595797270,
      "lat": 31.6832361,
      "lon": 34.5912265
    },
    {
      "type": "node",
      "id": 11595797271,
      "lat": 31.6817077,
      "lon": 34.5921653
    },
    {
      "type": "node",
      "id": 11595797272,
      "lat": 31.6816704,
      "lon": 34.5921769
    },
    {
      "type": "node",
      "id": 11595797273,
      "lat": 31.6816167,
      "lon": 34.5921983
    },
    {
      "type": "node",
      "id": 11595797274,
      "lat": 31.6815873,
      "lon": 34.5922166
    },
    {
      "type": "node",
      "id": 11595797275,
      "lat": 31.681564,
      "lon": 34.5922338
    },
    {
      "type": "node",
      "id": 11595797276,
      "lat": 31.681537,
      "lon": 34.5922527
    },
    {
      "type": "node",
      "id": 11595797277,
      "lat": 31.6816851,
      "lon": 34.5921231
    },
    {
      "type": "node",
      "id": 11595797278,
      "lat": 31.6816617,
      "lon": 34.5920854
    },
    {
      "type": "node",
      "id": 11595797279,
      "lat": 31.6816505,
      "lon": 34.5920539
    },
    {
      "type": "node",
      "id": 11595797280,
      "lat": 31.6816436,
      "lon": 34.5920265
    },
    {
      "type": "node",
      "id": 11595797281,
      "lat": 31.6816358,
      "lon": 34.591998
    },
    {
      "type": "node",
      "id": 11595797282,
      "lat": 31.6816266,
      "lon": 34.5919619
    },
    {
      "type": "node",
      "id": 11613689433,
      "lat": 31.6797675,
      "lon": 34.6065621
    },
    {
      "type": "node",
      "id": 11613689434,
      "lat": 31.6795848,
      "lon": 34.6062342
    },
    {
      "type": "node",
      "id": 11613689435,
      "lat": 31.6790408,
      "lon": 34.5958635
    },
    {
      "type": "node",
      "id": 11613689450,
      "lat": 31.68704,
      "lon": 34.5909297
    },
    {
      "type": "node",
      "id": 11613689451,
      "lat": 31.687033,
      "lon": 34.5907665
    },
    {
      "type": "node",
      "id": 11613689452,
      "lat": 31.6869822,
      "lon": 34.5907262
    },
    {
      "type": "node",
      "id": 11613689453,
      "lat": 31.6868669,
      "lon": 34.5908576
    },
    {
      "type": "node",
      "id": 11742971048,
      "lat": 31.6728712,
      "lon": 34.5981562
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
      "id": 11900286744,
      "lat": 31.6849819,
      "lon": 34.5911483
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
      "id": 11900322555,
      "lat": 31.6841061,
      "lon": 34.5893695
    },
    {
      "type": "node",
      "id": 11900322557,
      "lat": 31.683844,
      "lon": 34.5914853
    },
    {
      "type": "node",
      "id": 11900322558,
      "lat": 31.6838041,
      "lon": 34.5916166
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
      "id": 11900322579,
      "lat": 31.6891521,
      "lon": 34.590685
    },
    {
      "type": "node",
      "id": 11900322665,
      "lat": 31.6887972,
      "lon": 34.5935927
    },
    {
      "type": "node",
      "id": 11900322711,
      "lat": 31.6908198,
      "lon": 34.5915659
    },
    {
      "type": "node",
      "id": 11900322773,
      "lat": 31.6922914,
      "lon": 34.5929905
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
      "id": 12127516984,
      "lat": 31.6736978,
      "lon": 34.6108296
    },
    {
      "type": "node",
      "id": 12127516994,
      "lat": 31.6750223,
      "lon": 34.6111037
    },
    {
      "type": "node",
      "id": 12127516995,
      "lat": 31.6749845,
      "lon": 34.6110407
    },
    {
      "type": "node",
      "id": 12127516996,
      "lat": 31.6749487,
      "lon": 34.6110103
    },
    {
      "type": "node",
      "id": 12127516997,
      "lat": 31.6748812,
      "lon": 34.6109846
    },
    {
      "type": "node",
      "id": 12127516998,
      "lat": 31.6747381,
      "lon": 34.6109753
    },
    {
      "type": "node",
      "id": 12127516999,
      "lat": 31.674591,
      "lon": 34.6109846
    },
    {
      "type": "node",
      "id": 12127517000,
      "lat": 31.6745275,
      "lon": 34.6109986
    },
    {
      "type": "node",
      "id": 12127519601,
      "lat": 31.6743864,
      "lon": 34.6110523
    },
    {
      "type": "node",
      "id": 12127519602,
      "lat": 31.6742731,
      "lon": 34.6111037
    },
    {
      "type": "node",
      "id": 12127519603,
      "lat": 31.6742155,
      "lon": 34.6111061
    },
    {
      "type": "node",
      "id": 12127519604,
      "lat": 31.6741479,
      "lon": 34.611092
    },
    {
      "type": "node",
      "id": 12127519605,
      "lat": 31.6740903,
      "lon": 34.611064
    },
    {
      "type": "node",
      "id": 12127519606,
      "lat": 31.675058,
      "lon": 34.6112181
    },
    {
      "type": "node",
      "id": 12127519607,
      "lat": 31.6750819,
      "lon": 34.6113699
    },
    {
      "type": "node",
      "id": 12127519608,
      "lat": 31.6750878,
      "lon": 34.6114423
    },
    {
      "type": "node",
      "id": 12127519609,
      "lat": 31.6750819,
      "lon": 34.6115217
    },
    {
      "type": "node",
      "id": 12127519610,
      "lat": 31.675064,
      "lon": 34.6116011
    },
    {
      "type": "node",
      "id": 12127519611,
      "lat": 31.6750064,
      "lon": 34.6117388
    },
    {
      "type": "node",
      "id": 12127519612,
      "lat": 31.6741784,
      "lon": 34.6110984
    },
    {
      "type": "node",
      "id": 12127519631,
      "lat": 31.6752548,
      "lon": 34.6124557
    },
    {
      "type": "node",
      "id": 12127519632,
      "lat": 31.6752548,
      "lon": 34.6122899
    },
    {
      "type": "node",
      "id": 12127519633,
      "lat": 31.6752528,
      "lon": 34.6121685
    },
    {
      "type": "node",
      "id": 12127519634,
      "lat": 31.6752428,
      "lon": 34.6120751
    },
    {
      "type": "node",
      "id": 12127519635,
      "lat": 31.675213,
      "lon": 34.611963
    },
    {
      "type": "node",
      "id": 12127519636,
      "lat": 31.6751634,
      "lon": 34.6118743
    },
    {
      "type": "node",
      "id": 12127519637,
      "lat": 31.6750958,
      "lon": 34.6117949
    },
    {
      "type": "node",
      "id": 12127519638,
      "lat": 31.674911,
      "lon": 34.6117132
    },
    {
      "type": "node",
      "id": 12127519639,
      "lat": 31.6747639,
      "lon": 34.6116781
    },
    {
      "type": "node",
      "id": 12127519640,
      "lat": 31.6746288,
      "lon": 34.6116548
    },
    {
      "type": "node",
      "id": 12127519641,
      "lat": 31.6745076,
      "lon": 34.6116524
    },
    {
      "type": "node",
      "id": 12127519642,
      "lat": 31.6742326,
      "lon": 34.6116455
    },
    {
      "type": "node",
      "id": 12127519773,
      "lat": 31.6750857,
      "lon": 34.6114704
    },
    {
      "type": "node",
      "id": 12127519786,
      "lat": 31.6750458,
      "lon": 34.611179
    },
    {
      "type": "node",
      "id": 12127519802,
      "lat": 31.6749061,
      "lon": 34.6093565
    },
    {
      "type": "node",
      "id": 12127519943,
      "lat": 31.6737628,
      "lon": 34.6108684
    },
    {
      "type": "node",
      "id": 12127520268,
      "lat": 31.6747894,
      "lon": 34.6116842
    },
    {
      "type": "node",
      "id": 12135247782,
      "lat": 31.6745674,
      "lon": 34.6109898
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
      "id": 12219581402,
      "lat": 31.6834533,
      "lon": 34.605938
    },
    {
      "type": "node",
      "id": 12224070635,
      "lat": 31.6935385,
      "lon": 34.6129029
    },
    {
      "type": "node",
      "id": 12650512597,
      "lat": 31.677594,
      "lon": 34.6055267
    },
    {
      "type": "node",
      "id": 12768228005,
      "lat": 31.6833353,
      "lon": 34.5912105
    },
    {
      "type": "node",
      "id": 12768228015,
      "lat": 31.6840358,
      "lon": 34.5914008
    },
    {
      "type": "node",
      "id": 12771447465,
      "lat": 31.6806744,
      "lon": 34.6095625
    },
    {
      "type": "node",
      "id": 12771447466,
      "lat": 31.6803835,
      "lon": 34.6096712
    },
    {
      "type": "node",
      "id": 12771447467,
      "lat": 31.68051,
      "lon": 34.6096699
    },
    {
      "type": "node",
      "id": 12771447468,
      "lat": 31.6805682,
      "lon": 34.6097515
    },
    {
      "type": "node",
      "id": 12771447469,
      "lat": 31.6805645,
      "lon": 34.6099558
    },
    {
      "type": "node",
      "id": 12771447470,
      "lat": 31.6802373,
      "lon": 34.6096325
    },
    {
      "type": "node",
      "id": 12771447471,
      "lat": 31.6802754,
      "lon": 34.6097538
    },
    {
      "type": "node",
      "id": 12771447472,
      "lat": 31.6802671,
      "lon": 34.6099539
    },
    {
      "type": "node",
      "id": 12771447473,
      "lat": 31.6794447,
      "lon": 34.6060054
    },
    {
      "type": "node",
      "id": 12771447474,
      "lat": 31.6794615,
      "lon": 34.6062845
    },
    {
      "type": "node",
      "id": 12771447480,
      "lat": 31.6790021,
      "lon": 34.5959604
    },
    {
      "type": "node",
      "id": 12771447481,
      "lat": 31.6788761,
      "lon": 34.5957451
    },
    {
      "type": "node",
      "id": 12771447482,
      "lat": 31.6789281,
      "lon": 34.595892
    },
    {
      "type": "node",
      "id": 12771447483,
      "lat": 31.6787483,
      "lon": 34.5960487
    },
    {
      "type": "node",
      "id": 12771447484,
      "lat": 31.6788761,
      "lon": 34.5959752
    },
    {
      "type": "node",
      "id": 12771447485,
      "lat": 31.6788686,
      "lon": 34.5955959
    },
    {
      "type": "node",
      "id": 12771447486,
      "lat": 31.6787791,
      "lon": 34.5957194
    },
    {
      "type": "node",
      "id": 12771447487,
      "lat": 31.6786533,
      "lon": 34.5958031
    },
    {
      "type": "node",
      "id": 12771447488,
      "lat": 31.6785992,
      "lon": 34.5959352
    },
    {
      "type": "node",
      "id": 12771447489,
      "lat": 31.678649,
      "lon": 34.5960514
    },
    {
      "type": "node",
      "id": 12771447490,
      "lat": 31.6785357,
      "lon": 34.5958476
    },
    {
      "type": "node",
      "id": 12771447491,
      "lat": 31.6786578,
      "lon": 34.5961468
    },
    {
      "type": "node",
      "id": 12771520275,
      "lat": 31.6793475,
      "lon": 34.6062018
    },
    {
      "type": "node",
      "id": 12771520278,
      "lat": 31.6774814,
      "lon": 34.6066023
    },
    {
      "type": "node",
      "id": 12771520279,
      "lat": 31.6776268,
      "lon": 34.6066149
    },
    {
      "type": "node",
      "id": 12771531112,
      "lat": 31.6776788,
      "lon": 34.6059206
    },
    {
      "type": "node",
      "id": 12771531114,
      "lat": 31.6764549,
      "lon": 34.6060929
    },
    {
      "type": "node",
      "id": 12771531117,
      "lat": 31.676652,
      "lon": 34.6062597
    },
    {
      "type": "node",
      "id": 12771531119,
      "lat": 31.6766423,
      "lon": 34.6063622
    },
    {
      "type": "node",
      "id": 13007231044,
      "lat": 31.6776803,
      "lon": 34.605548
    },
    {
      "type": "node",
      "id": 13007231054,
      "lat": 31.6765571,
      "lon": 34.6063517
    },
    {
      "type": "node",
      "id": 13032152785,
      "lat": 31.6842603,
      "lon": 34.5932562
    },
    {
      "type": "node",
      "id": 13036866862,
      "lat": 31.6865302,
      "lon": 34.5919351
    },
    {
      "type": "node",
      "id": 13036870860,
      "lat": 31.6858099,
      "lon": 34.5924623
    },
    {
      "type": "node",
      "id": 13036895481,
      "lat": 31.6867296,
      "lon": 34.591944
    },
    {
      "type": "node",
      "id": 13076243777,
      "lat": 31.6831829,
      "lon": 34.5875193
    },
    {
      "type": "node",
      "id": 13076243787,
      "lat": 31.6833743,
      "lon": 34.5876041
    },
    {
      "type": "node",
      "id": 13076482512,
      "lat": 31.6812142,
      "lon": 34.5871587
    },
    {
      "type": "node",
      "id": 13233416686,
      "lat": 31.681208,
      "lon": 34.5872005
    },
    {
      "type": "node",
      "id": 13233416692,
      "lat": 31.6808533,
      "lon": 34.5891462
    },
    {
      "type": "node",
      "id": 13266000007,
      "lat": 31.6775788,
      "lon": 34.6055845
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
    },
    {
      "type": "node",
      "id": 13606669825,
      "lat": 31.6912866,
      "lon": 34.5962654
    },
    {
      "type": "node",
      "id": 13606669827,
      "lat": 31.6913269,
      "lon": 34.5962825
    },
    {
      "type": "node",
      "id": 13606669830,
      "lat": 31.691192,
      "lon": 34.5962243
    },
    {
      "type": "node",
      "id": 13606669832,
      "lat": 31.690799,
      "lon": 34.5974821
    },
    {
      "type": "node",
      "id": 13606669834,
      "lat": 31.6904082,
      "lon": 34.5987774
    },
    {
      "type": "node",
      "id": 13606669837,
      "lat": 31.6896872,
      "lon": 34.5969998
    },
    {
      "type": "node",
      "id": 13925753748,
      "lat": 31.6904686,
      "lon": 34.596663
    },
    {
      "type": "node",
      "id": 14022127970,
      "lat": 31.6764125,
      "lon": 34.6089053
    },
    {
      "type": "node",
      "id": 14022147522,
      "lat": 31.6851786,
      "lon": 34.6103948
    }
  ]
}

---
/*
Fictional Crystal Lab for Sandboxels

This is deliberately fantasy chemistry. None of the element names, combinations,
temperatures, or reactions describe a real drug or real-world synthesis.

Install: place this file in Sandboxels' mods folder, then enable
fictional_crystal_lab.js in the Mod Manager.
*/

(function () {
    "use strict";

    const category = "fictional";
    const purityProfiles = {
        aurora_base: [68, 82],
        blue_crystal_slurry: [88, 97],
        blue_crystal_melt: [84, 94],
        blue_prism_crystal: [98, 100],
        violet_extract: [65, 80],
        violet_crystal_slurry: [84, 94],
        violet_prism_crystal: [91, 98],
        charged_base: [70, 84],
        ion_crystal_slurry: [87, 96],
        teal_prism_crystal: [94, 99],
        amber_slurry: [57, 72],
        amber_prism_crystal: [63, 78],
        moss_slurry: [20, 40],
        moss_prism_crystal: [28, 49],
        tainted_slurry: [4, 22],
        prismatic_dust: [45, 75],
        lab_sludge: [0, 8]
    };
    const purityContaminants = {
        ash: 3.5,
        rust: 5,
        dirt: 6,
        dirty_water: 4,
        inert_lab_dust: 2.5,
        lab_sludge: 8,
        tainted_slurry: 10,
        smoke: 1.5
    };
    let purityHudTimer = null;
    let lastPurityPixel = null;
    let lastPurityTestAt = 0;

    function clampPurity(value) {
        return Math.max(0, Math.min(100, Math.round(value)));
    }

    function pixelPurityValue(pixel) {
        const profile = purityProfiles[pixel.element];
        if (!profile) return null;

        // Stable per-pixel variation: rescanning an unchanged batch gives the
        // same result, while separate batches have a little natural variation.
        const seed = ((((pixel.x + 17) * 73856093) ^
            ((pixel.y + 31) * 19349663)) >>> 0);
        return profile[0] + (seed % (profile[1] - profile[0] + 1));
    }

    function testBatchPurity(pixel) {
        let total = 0;
        let samples = 0;
        let contaminationPenalty = 0;
        let mixedRoutePenalty = 0;

        // Analyze a 5x5 patch, so nearby waste and mixed crystal colors matter.
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                const column = pixelMap[pixel.x + dx];
                const neighbor = column && column[pixel.y + dy];
                if (!neighbor) continue;

                const neighborPurity = pixelPurityValue(neighbor);
                if (neighborPurity !== null) {
                    total += neighborPurity;
                    samples++;
                    if (neighbor.element !== pixel.element) mixedRoutePenalty += 0.45;
                }
                contaminationPenalty += purityContaminants[neighbor.element] || 0;
            }
        }

        if (!samples) return null;
        return clampPurity((total / samples) - contaminationPenalty - mixedRoutePenalty);
    }

    function purityGrade(purity) {
        if (purity === 100) return "PERFECT";
        if (purity >= 95) return "S";
        if (purity >= 90) return "A";
        if (purity >= 80) return "B";
        if (purity >= 65) return "C";
        if (purity >= 40) return "D";
        return "FAILED";
    }

    function purityColor(purity) {
        if (purity === 100) return "#9ffcff";
        if (purity >= 95) return "#4bd7ff";
        if (purity >= 90) return "#63e68d";
        if (purity >= 80) return "#d5e85c";
        if (purity >= 65) return "#ffc04d";
        if (purity >= 40) return "#ff824d";
        return "#e94b5f";
    }

    function showPurityHud(message, purity) {
        if (typeof document === "undefined" || !document.body) {
            if (typeof console !== "undefined") console.log(message);
            return;
        }

        let hud = document.getElementById("fictional-crystal-purity-hud");
        if (!hud) {
            hud = document.createElement("div");
            hud.id = "fictional-crystal-purity-hud";
            hud.style.cssText = "position:fixed;left:50%;bottom:22px;transform:translateX(-50%);" +
                "z-index:99999;min-width:250px;padding:10px 14px;border:2px solid #bceeff;" +
                "border-radius:8px;background:rgba(12,18,29,.94);color:white;font:700 15px monospace;" +
                "text-align:center;box-shadow:0 0 18px rgba(80,210,255,.45);pointer-events:none;" +
                "transition:opacity .25s";

            const label = document.createElement("div");
            label.className = "purity-label";
            const track = document.createElement("div");
            track.style.cssText = "height:8px;margin-top:7px;border-radius:5px;background:#303747;overflow:hidden";
            const bar = document.createElement("div");
            bar.className = "purity-bar";
            bar.style.cssText = "height:100%;width:0;transition:width .25s,background .25s";
            track.appendChild(bar);
            hud.appendChild(label);
            hud.appendChild(track);
            document.body.appendChild(hud);
        }

        hud.querySelector(".purity-label").textContent = message;
        const bar = hud.querySelector(".purity-bar");
        bar.style.width = (purity === null ? 0 : purity) + "%";
        bar.style.background = purity === null ? "#778095" : purityColor(purity);
        hud.style.opacity = "1";

        if (purityHudTimer) clearTimeout(purityHudTimer);
        purityHudTimer = setTimeout(function () {
            hud.style.opacity = "0";
        }, 3500);
    }

    elements.prism_purity_tester = {
        color: ["#62dcff", "#b889ff", "#70efb0"],
        category: "tools",
        tool: function (pixel) {
            const now = Date.now();
            if (pixel === lastPurityPixel && now - lastPurityTestAt < 300) return;
            lastPurityPixel = pixel;
            lastPurityTestAt = now;

            const purity = testBatchPurity(pixel);
            if (purity === null) {
                showPurityHud("NO FICTIONAL BATCH DETECTED", null);
                return;
            }

            const grade = purityGrade(purity);
            pixel.fictionalPurity = purity;
            pixel.fictionalPurityGrade = grade;
            showPurityHud("PURITY  " + purity + "%   GRADE " + grade, purity);
        },
        excludeRandom: true,
        desc: "Click a fictional slurry or crystal to test a nearby 5x5 batch from 0-100%."
    };

    // Shared waste products -------------------------------------------------

    elements.inert_lab_dust = {
        color: ["#777b80", "#8b8e91", "#686b70"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1320,
        tempHigh: 310,
        stateHigh: "smoke",
        desc: "Spent, fictional catalyst dust. Wash it with water to make lab sludge."
    };

    elements.lab_sludge = {
        color: ["#59624c", "#6d745a", "#454c3d"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1240,
        viscosity: 9000,
        tempHigh: 105,
        stateHigh: ["steam", "inert_lab_dust"],
        reactions: {
            bleach: { elem1: "inert_lab_dust", elem2: null, chance: 0.08 }
        },
        desc: "Dirty fictional lab waste. Bleach slowly neutralizes it."
    };

    elements.prism_fume = {
        color: ["#b9d8e3", "#d9c1ef", "#9dc8c2"],
        behavior: behaviors.GAS,
        category: category,
        state: "gas",
        density: 1.7,
        tempLow: 18,
        stateLow: "prism_solvent",
        burn: 35,
        burnTime: 80,
        burnInto: ["smoke", "carbon_dioxide"],
        reactions: {
            fire: { elem1: "fire", chance: 0.18 },
            plasma: { elem1: "fire", chance: 0.4 }
        },
        desc: "Flammable vapor from Prism Solvent. Keep it away from sparks."
    };

    // Common fantasy ingredients ------------------------------------------

    elements.prism_solvent = {
        color: ["#b9e4ec", "#d3f0f2", "#9dd0dd"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 770,
        viscosity: 2,
        tempHigh: 46,
        stateHigh: "prism_fume",
        tempLow: -38,
        stateLow: "frozen_prism_solvent",
        burn: 45,
        burnTime: 110,
        burnInto: ["fire", "smoke", "carbon_dioxide"],
        desc: "A volatile, entirely fictional rainbow solvent used by two crystal routes."
    };

    elements.frozen_prism_solvent = {
        color: ["#dffaff", "#cbeff6", "#ffffff"],
        behavior: behaviors.WALL,
        category: category,
        state: "solid",
        density: 810,
        tempHigh: -37,
        stateHigh: "prism_solvent",
        hidden: true
    };

    elements.zephyr_salt = {
        color: ["#f4f1d7", "#fffbea", "#ddd9bd"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1510,
        reactions: {
            water: { elem1: null, elem2: "salt_water", chance: 0.04 }
        },
        desc: "A pale fantasy mineral and the starting solid for the blue route."
    };

    elements.noctis_essence = {
        color: ["#6174a8", "#788cc0", "#495c90"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 920,
        viscosity: 7,
        tempHigh: 88,
        stateHigh: ["prism_fume", "smoke"],
        reactions: {
            zephyr_salt: { elem1: "aurora_base", elem2: null, chance: 0.22 },
            fire: { elem1: "fire", chance: 0.12 }
        },
        desc: "A made-up midnight-blue essence. Combine it with Zephyr Salt."
    };

    elements.ember_catalyst = {
        color: ["#dc5946", "#f06c50", "#b94336"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1830,
        tempHigh: 260,
        stateHigh: "fire",
        desc: "A hot fantasy catalyst for the blue route."
    };

    elements.frostleaf = {
        color: ["#7fc9a0", "#9addb8", "#66ae86"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 430,
        burn: 20,
        burnTime: 90,
        burnInto: ["smoke", "ash"],
        reactions: {
            prism_solvent: { elem1: "violet_extract", elem2: null, chance: 0.18 }
        },
        desc: "Leaves from an imaginary frost plant. Steep them in Prism Solvent."
    };

    elements.moon_catalyst = {
        color: ["#bbb6e8", "#d0cef5", "#958ecb"],
        behavior: behaviors.STURDYPOWDER,
        category: category,
        state: "solid",
        density: 1680,
        desc: "A cool fantasy catalyst for the violet route."
    };

    elements.star_salt = {
        color: ["#f4f8ff", "#dfeaff", "#fff9cc"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1450,
        desc: "A sparkling imaginary salt used in the electric route."
    };

    elements.ion_gel = {
        color: ["#54d6c9", "#72eadc", "#38b8b1"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1080,
        viscosity: 260,
        conduct: 0.92,
        reactions: {
            star_salt: { elem1: "charged_base", elem2: null, chance: 0.2 }
        },
        desc: "Conductive fantasy gel. Mix with Star Salt, then use Spark Powder."
    };

    elements.spark_powder = {
        color: ["#ffe66d", "#fff3a0", "#eac94f"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1210,
        conduct: 1,
        desc: "A bright fictional powder that activates the electric route."
    };

    // Route 1: warm blue crystals -----------------------------------------

    elements.aurora_base = {
        color: ["#8dbbd0", "#729fb9", "#a3cedc"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1035,
        viscosity: 80,
        reactions: {
            ember_catalyst: {
                elem1: "blue_crystal_slurry",
                elem2: "inert_lab_dust",
                chance: 0.16,
                temp1: 72,
                temp2: 72
            },
            ash: { elem1: "amber_slurry", elem2: "inert_lab_dust", chance: 0.12 },
            dirt: { elem1: "tainted_slurry", elem2: "lab_sludge", chance: 0.09 }
        },
        desc: "Blue-route intermediate. Add Ember Catalyst, then heat and cool."
    };

    elements.blue_crystal_slurry = {
        color: ["#6096b5", "#78b3ce", "#477e9d"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1110,
        viscosity: 1200,
        tempHigh: 96,
        stateHigh: ["blue_crystal_melt", "prism_fume"],
        tempLow: 18,
        stateLow: "blue_prism_crystal",
        desc: "Warm blue slurry. Let it cool below 18 C to crystallize."
    };

    elements.blue_crystal_melt = {
        color: ["#4a8bad", "#69b5d4", "#376f91"],
        behavior: behaviors.MOLTEN,
        category: category,
        state: "liquid",
        density: 1140,
        viscosity: 500,
        tempLow: 90,
        stateLow: "blue_crystal_slurry",
        hidden: true
    };

    elements.blue_prism_crystal = {
        color: ["#eafcff", "#b8e9f4", "#8fd4e7", "#ffffff"],
        behavior: behaviors.STURDYPOWDER,
        category: category,
        state: "solid",
        density: 1260,
        hardness: 0.46,
        tempHigh: 94,
        stateHigh: "blue_crystal_melt",
        breakInto: ["blue_prism_crystal", "prismatic_dust"],
        desc: "Blue fantasy crystals from the heated Aurora route."
    };

    // Route 2: chilled violet crystals ------------------------------------

    elements.violet_extract = {
        color: ["#8863a8", "#a67ac2", "#724f91"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 990,
        viscosity: 45,
        reactions: {
            moon_catalyst: { elem1: "violet_crystal_slurry", elem2: "inert_lab_dust", chance: 0.15 },
            rust: { elem1: "moss_slurry", elem2: "inert_lab_dust", chance: 0.1 },
            ash: { elem1: "tainted_slurry", elem2: "lab_sludge", chance: 0.08 }
        },
        desc: "Frostleaf extract. Add Moon Catalyst and chill the resulting slurry."
    };

    elements.violet_crystal_slurry = {
        color: ["#78529d", "#946bb8", "#603d83"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1090,
        viscosity: 1500,
        tempLow: -8,
        stateLow: "violet_prism_crystal",
        tempHigh: 115,
        stateHigh: ["prism_fume", "inert_lab_dust"],
        desc: "Violet slurry. Chill it below -8 C to crystallize."
    };

    elements.violet_prism_crystal = {
        color: ["#f0dcff", "#d0a8f0", "#ae7bd6", "#ffffff"],
        behavior: behaviors.STURDYPOWDER,
        category: category,
        state: "solid",
        density: 1290,
        hardness: 0.5,
        tempHigh: 108,
        stateHigh: "violet_crystal_slurry",
        breakInto: ["violet_prism_crystal", "prismatic_dust"],
        desc: "Violet fantasy crystals from the chilled Frostleaf route."
    };

    // Route 3: shock-activated teal crystals ------------------------------

    elements.charged_base = {
        color: ["#42bfb7", "#5dd8cc", "#319e9b"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1060,
        viscosity: 310,
        conduct: 0.96,
        reactions: {
            spark_powder: { elem1: "ion_crystal_slurry", elem2: "inert_lab_dust", chance: 0.18 },
            dirt: { elem1: "moss_slurry", elem2: "lab_sludge", chance: 0.08 }
        },
        desc: "Electric-route intermediate. Add Spark Powder, then shock the slurry."
    };

    elements.ion_crystal_slurry = {
        color: ["#27a9a4", "#43c8bd", "#168f90"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1125,
        viscosity: 980,
        conduct: 1,
        tick: function (pixel) {
            if (pixel.charge && Math.random() < 0.08) {
                changePixel(pixel, "teal_prism_crystal");
                pixel.temp += 8;
            }
        },
        tempHigh: 135,
        stateHigh: ["prism_fume", "inert_lab_dust"],
        desc: "Highly conductive slurry. Use the Shock tool to crystallize it."
    };

    elements.teal_prism_crystal = {
        color: ["#d8fff7", "#8ee9dc", "#5ed0c5", "#ffffff"],
        behavior: behaviors.STURDYPOWDER,
        category: category,
        state: "solid",
        density: 1240,
        hardness: 0.43,
        conduct: 0.65,
        tempHigh: 128,
        stateHigh: "ion_crystal_slurry",
        breakInto: ["teal_prism_crystal", "prismatic_dust"],
        desc: "Teal fantasy crystals produced by electrically charging Ion Slurry."
    };

    // Alternate / contaminated color outcomes -----------------------------

    elements.amber_slurry = {
        color: ["#a96f2e", "#c28a42", "#87531f"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1160,
        viscosity: 1800,
        tempLow: 12,
        stateLow: "amber_prism_crystal",
        desc: "Ash-contaminated slurry. Cooling produces amber crystals."
    };

    elements.amber_prism_crystal = {
        color: ["#ffe0a0", "#efb85f", "#d38b36", "#fff4cd"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1370,
        hardness: 0.31,
        tempHigh: 82,
        stateHigh: "amber_slurry",
        breakInto: ["amber_prism_crystal", "ash"],
        desc: "Brittle amber fantasy crystals caused by ash contamination."
    };

    elements.moss_slurry = {
        color: ["#65733e", "#7c884d", "#4f5d31"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1210,
        viscosity: 2400,
        tempLow: 5,
        stateLow: "moss_prism_crystal",
        desc: "A contaminated green slurry. Cooling makes crumbly moss crystals."
    };

    elements.moss_prism_crystal = {
        color: ["#baca83", "#91a55c", "#687b3d", "#dbe5ae"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 1410,
        hardness: 0.22,
        tempHigh: 75,
        stateHigh: "moss_slurry",
        breakInto: ["moss_prism_crystal", "rust", "inert_lab_dust"],
        desc: "Impure green fantasy crystals formed after dirt or rust contamination."
    };

    elements.tainted_slurry = {
        color: ["#534b3d", "#665d4b", "#403a31"],
        behavior: behaviors.LIQUID,
        category: category,
        state: "liquid",
        density: 1260,
        viscosity: 4200,
        tempHigh: 90,
        stateHigh: ["prism_fume", "lab_sludge", "smoke"],
        reactions: {
            water: { elem1: "lab_sludge", elem2: "dirty_water", chance: 0.12 }
        },
        desc: "A failed batch. Heating makes fumes; water turns it into sludge."
    };

    elements.prismatic_dust = {
        color: ["#d8f4ff", "#e5d2ff", "#b9fff1", "#fff0bb"],
        behavior: behaviors.POWDER,
        category: category,
        state: "solid",
        density: 980,
        burn: 8,
        burnTime: 45,
        burnInto: ["smoke", "inert_lab_dust"],
        reactions: {
            water: { elem1: "lab_sludge", elem2: "dirty_water", chance: 0.05 }
        },
        desc: "Mixed dust chipped from fantasy crystals."
    };

    // Water cleanup works from either side of the reaction pair.
    if (elements.water) {
        if (!elements.water.reactions) elements.water.reactions = {};
        elements.water.reactions.inert_lab_dust = {
            elem1: "dirty_water",
            elem2: "lab_sludge",
            chance: 0.04
        };
        elements.water.reactions.prismatic_dust = {
            elem1: "dirty_water",
            elem2: "lab_sludge",
            chance: 0.04
        };
    }
})();

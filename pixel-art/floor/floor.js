// ------- Define stuff

// Tile sizes
let width = 32;
let height = 32;

// plank
let nbPlanks = 8;
let spaceBetweenVertOutlines = Math.floor(width / 6);
let areIntersectionsEnabled = true;
let distanceConnectionIntersections = width / 6;

let shadingPercentage = -2;
let areColorsGenerated = true;

// preview
const previewScale = 5;

let distanceBetweenPlanks = height / nbPlanks;

// colors
let defaultPlankColor = "#96704A";
let darkerPlankColor = "#916B44";
let outlinesPlankColor = "#815D34";
let intersectionColor = "#73532E";
let defaultBaseSchemeColor = "#96704A";

// variations
const NB_VARIATIONS_MAX = 10;

let nbVariations = 1;
let variationsStages = [];

//#region Utility functions
// Get seeded random number between min & max.
const GetNextNumber = (nextNumber, min, max) =>
    Math.floor(nextNumber() * (max - min) + min);

/**
 * Make a random id
 * @param {number} length 
 * @returns The id
 */
function MakeID(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}

/// Konva.js utility functions
// Stack a list of Konva groups into one Konva group
function StackGroups(groups) {
    const group = new Konva.Group();
    for (let i = 0; i < groups.length; i++) {
        // Clone each group to avoid future changes to them later on.
        const clone = groups[i].clone();
        group.add(clone);
    }
    return group;
}

// Draw a Konva group onto a Konva stage
function DrawGroupOntoStage(group, stage) {
    let layer = new Konva.Layer();
    layer.add(group);
    stage.add(layer);
}

// Clear a Konva stage
function Clear(stage) {
    stage.destroyChildren();
    stage.clear();
}

/**
 * https://stackoverflow.com/a/13532993
*/
// Lighten/darken the color
function shadeColor(color, percent) {

    var R = parseInt(color.substring(1, 3), 16);
    var G = parseInt(color.substring(3, 5), 16);
    var B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R < 255) ? R : 255;
    G = (G < 255) ? G : 255;
    B = (B < 255) ? B : 255;

    var RR = ((R.toString(16).length === 1) ? "0" + R.toString(16) : R.toString(16));
    var GG = ((G.toString(16).length === 1) ? "0" + G.toString(16) : G.toString(16));
    var BB = ((B.toString(16).length === 1) ? "0" + B.toString(16) : B.toString(16));

    return "#" + RR + GG + BB;
}

// Create a point
const CreatePoint = (x, y) => ({ x, y });
//#endregion

//#region Draw figures on canvas
function DrawKonvaLine(group, color) {
    return function (start, end) {
        const line = new Konva.Line({
            points: [start.x, start.y, end.x, end.y],
            stroke: color,
            strokeWidth: 1
        });

        group.add(line);
    }
}

function DrawKonvaRect(group, color) {
    return function (x, y, height, width) {
        const rect = new Konva.Rect({
            x: x, y: y,
            width: width, height: height,
            fill: color
        });

        group.add(rect);
    }
}

function DrawKonvaLetterT(group, color) {
    const drawLine = DrawKonvaLine(group, color);

    return function (leftPoint, rightPoint, centerPoint, bottomPoint) {
        drawLine(leftPoint, rightPoint);
        drawLine(centerPoint, bottomPoint);
    }
}
//#endregion

//#region Draw elements of floor texture (planks, delimitations, intersections)
function DrawHorizOutlines(
    // height & width of the tile
    height, width,
    distanceBetweenPlanks,
    // takes start & end points to draw a line (from DrawKonvaLine)
    drawLine) {
    let indexHeight = 0;

    while (indexHeight < height) {
        indexHeight += (distanceBetweenPlanks - 1);

        // 0.5 are for anti-aliasing, cf MDN: 
        // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors#a_linewidth_example
        const start = CreatePoint(0, indexHeight + 0.5)
        const end = CreatePoint(width, indexHeight + 0.5)

        drawLine(start, end);
        indexHeight++;
    }
}

// Getting two outlines that are really close to each other is ugly.
// So, an adjustment is needed.
const adjustX = (
    x, previousX,
    distanceBetweenOutlines,
    nextNumber) => {
    const diff = Math.abs(previousX - x);
    let adjustedX = x;

    // Adjust the distance with previous outline.
    if (diff <= distanceBetweenOutlines) {
        // If outline is on the left of previous one.
        adjustedX = x < previousX
            ? previousX - distanceBetweenOutlines
            : previousX + distanceBetweenOutlines;
    }
    // If outline is at the same location than the previous one.
    if (diff === 0) {
        // Randomly decides its location.
        const isOutlineOnLeft = Math.floor(2 * nextNumber()) === 1;
        adjustedX = isOutlineOnLeft
            ? previousX - distanceBetweenOutlines
            : previousX + distanceBetweenOutlines;
    }

    return adjustedX;
}

function DrawVertOutlines(
    height, width,
    distanceBetweenPlanks, distanceBetweenOutlines,
    nextNumber, drawLine) {
    let indexHeight = 0;
    let previousX = -50;
    let intersections = [];

    const getRandomX = () => {
        // Default max & min using distance between outlines
        // to avoid adjusting an outline outside of the tile.
        const max = width - 1 - distanceBetweenOutlines;
        const min = distanceBetweenOutlines;

        // Random seeded number returned by nextNumber
        return Math.floor(nextNumber() * (max - min + 1) + min);
    }

    while (indexHeight < height) {
        // random coordinate for the outline
        let x = getRandomX();

        // Adjust the X if needed
        x = adjustX(x, previousX, distanceBetweenOutlines, nextNumber);
        previousX = x;

        // anti-aliasing fix
        x += 0.5;

        // top of outline
        const start = CreatePoint(x, indexHeight - 1);
        // bottom of outline
        const end = CreatePoint(x, indexHeight + (distanceBetweenPlanks - 1));

        drawLine(start, end);

        indexHeight += distanceBetweenPlanks;

        // Add new intersections.
        intersections = [
            ...intersections,
            [start, end]
        ];
    }

    return intersections;
}

// Get points from intersection.
const getTopPoint = (intersection) => intersection[0];
const getBottomPoint = (intersection) => intersection[1];
// Vertical spreading based on a point.
const verticalSpreadingFromPoint = (point, spreading) => ({
    center: CreatePoint(point.x, point.y),
    bottom: CreatePoint(point.x, point.y + spreading)
});

function setVerticalSpreading(
    intersection, nextNumber,
    minVertSpread, maxVertSpread) {
    // Should darken top intersection of outline?
    const shouldDarkenTop = nextNumber() > 0.5;
    const direction = (shouldDarkenTop ? 1 : -1);
    const vertSpread =
        GetNextNumber(nextNumber, minVertSpread, maxVertSpread) * direction;
    const chosenPoint = shouldDarkenTop
        ? getTopPoint(intersection)
        : getBottomPoint(intersection);

    return verticalSpreadingFromPoint(chosenPoint, vertSpread);
}

function shouldIntersectionsBeConnected(
    point, previous,
    distanceBetweenOutlines) {
    let result = {
        shouldBeConnected: false,
        isLeftPoint: false
    };

    // If previous intersection is not on same abscissa as current one.
    if (previous.y !== point.y) {
        return result;
    }

    // If diff > 0, previous is on left.
    // If diff < 0, previous is on right.
    const diff = point.x - previous.x;
    const shouldBeConnected = Math.abs(diff) <= distanceBetweenOutlines;

    return {
        shouldBeConnected,
        isLeftPoint: diff > 0
    }
}

function setHorizontalSpreading(
    centerPoint, previous,
    distanceBetweenOutlines, nextNumber,
    minHorizSpread, maxHorizSpread) {
    // Formula to determine how much left/right branches spread.
    const computeBranchSpreading =
        () => GetNextNumber(nextNumber, minHorizSpread, maxHorizSpread);
    let leftSpreading = computeBranchSpreading();
    let rightSpreading = computeBranchSpreading();

    // If intersections should be connected.
    const { shouldBeConnected, isLeftPoint } =
        shouldIntersectionsBeConnected(centerPoint, previous, distanceBetweenOutlines);

    // Set the left/right spreading.
    if (shouldBeConnected) {
        const diff = Math.abs(previous.x - centerPoint.x);
        if (isLeftPoint) {
            leftSpreading = diff;
        } else {
            rightSpreading = diff;
        }
    }

    // Anti-aliasing fix.
    const tmpHorizPoint = CreatePoint(centerPoint.x - 0.5, centerPoint.y + 0.5);

    // Left/right spread of intersection for "T".
    return {
        left: CreatePoint(tmpHorizPoint.x - leftSpreading, tmpHorizPoint.y),
        right: CreatePoint(tmpHorizPoint.x + rightSpreading, tmpHorizPoint.y)
    };
}

function DrawIntersections(
    areIntersectionsEnabled,
    distanceConnectionIntersections,
    distanceBetweenOutlines, distanceBetweenPlanks,
    intersections,
    nextNumber, drawLetterT) {
    // Max spreads.
    // Spread is how far intersection is darkened.
    const maxVertSpread = Math.floor(distanceBetweenPlanks / 2);
    const minVertSpread = Math.floor(maxVertSpread / 4);
    const maxHorizSpread = distanceBetweenOutlines / 2;
    const minHorizSpread = Math.floor(maxHorizSpread / 3);

    // Previous darkened intersection.
    let previous = CreatePoint(-50, -50);

    intersections.forEach((intersection) => {
        // Should intersection be darkened?
        const shouldBeDarkened = nextNumber() < 0.5;
        if (!shouldBeDarkened) {
            return;
        }

        // Vertical spread
        const { center, bottom } = setVerticalSpreading(
            intersection, nextNumber,
            minVertSpread, maxVertSpread);

        // Horizontal spread
        const { left, right } = setHorizontalSpreading(
            center, previous,
            distanceConnectionIntersections, nextNumber,
            minHorizSpread, maxHorizSpread
        );

        // Update previous intersection.
        previous = center;

        // Only done here to keep the same generation for vertical outlines
        // whether intersections are enabled or not.
        // TODO: Think of something a bit more clean & efficient. 
        if (!areIntersectionsEnabled) {
            return;
        }

        // Draw the "T" that will "darken" the intersection.
        drawLetterT(left, right, center, bottom);
    });
}

function DrawPlanks(height, width, distanceBetweenPlanks, nextNumber, drawPlank, drawDarkerPlank) {
    let indexHeight = 0;

    while (indexHeight < height) {
        const isDefaultPlank = nextNumber() < 0.7;

        if (isDefaultPlank) {
            drawPlank(0, indexHeight, distanceBetweenPlanks, width);
        } else {
            drawDarkerPlank(0, indexHeight, distanceBetweenPlanks, width);
        }

        indexHeight += distanceBetweenPlanks;
    }
}
//#endregion

//#region Generation functions
function GeneratePreview(width, height, tiles, previewStage, scale) {
    const cloneTile = (tile, x, y) =>
        (tile.clone({ x, y }));
    const getRandomTile = () => tiles[Math.floor(Math.random() * tiles.length)];

    // Used to copy/paste tile on layer.
    let layer = new Konva.Layer();

    // Join random groups together to create the preview
    for (let x = 0; x < width * scale; x += width) {
        for (let y = 0; y < height * scale; y += height) {
            const tile = getRandomTile();
            // Copy & Paste the tile.
            const clone = cloneTile(tile, x, y);
            layer.add(clone);
        }
    }

    // Draw the preview.
    previewStage.add(layer);
}

function Generate(seed) {
    // Seeded random number generator.
    const genRnd = new Math.seedrandom(seed);

    /// Konva groups
    // Planks & horizontal outlines are reusable for variations.
    let reusableGroup = new Konva.Group();
    let othersGroup = new Konva.Group();

    /// Functions to draw shapes.
    const drawKonvaRectLightPlankColor = DrawKonvaRect(reusableGroup, defaultPlankColor);
    const drawKonvaRectDarkPlankColor = DrawKonvaRect(reusableGroup, darkerPlankColor);
    const drawKonvaLine = (group) => DrawKonvaLine(group, outlinesPlankColor);
    const drawKonvaLetterT = DrawKonvaLetterT(othersGroup, intersectionColor);

    // Add planks to reusable group.
    DrawPlanks(
        height, width,
        distanceBetweenPlanks, genRnd,
        drawKonvaRectLightPlankColor, drawKonvaRectDarkPlankColor
    );
    // Add horizontal outlines to reusable group.
    DrawHorizOutlines(height, width, distanceBetweenPlanks, drawKonvaLine(reusableGroup));

    const drawVertOutlinesAndIntersections = (stage) => {
        // Add vertical outlines to non-reusables group.
        // Remove first because no horizontal outline at the top.
        const [, ...intersections] = DrawVertOutlines(
            height, width,
            distanceBetweenPlanks, spaceBetweenVertOutlines,
            genRnd, drawKonvaLine(othersGroup)
        );

        // Add intersections to non-reusables group.
        DrawIntersections(
            areIntersectionsEnabled,
            distanceConnectionIntersections,
            spaceBetweenVertOutlines, distanceBetweenPlanks,
            intersections,
            genRnd, drawKonvaLetterT
        );

        // Draw all groups onto the stage.
        const group = StackGroups([reusableGroup, othersGroup]);
        DrawGroupOntoStage(group, stage);

        // Clear non-reusables group for future use.
        othersGroup.destroyChildren();

        return group;
    }

    DrawGroupOntoStage(reusableGroup, stage);

    let groups = [];

    // First result
    let tmpGroup = drawVertOutlinesAndIntersections(stage);
    groups.push(tmpGroup);

    // Variations
    for (let variationStage of variationsStages) {
        tmpGroup = drawVertOutlinesAndIntersections(variationStage);
        groups.push(tmpGroup);
    }

    GeneratePreview(width, height, groups, previewStage, previewScale);
}

function GenerateFloor(seed = MakeID(10)) {
    UpdateOptions();

    Clear(stage);
    Generate(seed);

    document.getElementById("input-seed").value = seed;
}

function GenerateSameFloorNewOptions() {
    const seed = GetSeed();
    GenerateFloor(seed);
}
//#endregion

//#region Get options values from the HTML
function GetSeed() {
    return document.getElementById("input-seed").value;
}

function GetCanvasAttributes() {
    width = parseInt(document.getElementById("canvas-width").value);
    height = parseInt(document.getElementById("canvas-height").value);
}

function GetPlankAttributes() {
    // planks
    nbPlanks = parseInt(document.getElementById("nb-planks").value);
    // outlines
    const divisorOutlines = parseInt(document.getElementById("space-between-delim").value);
    spaceBetweenVertOutlines = Math.floor(width / divisorOutlines);
    // intersections
    areIntersectionsEnabled = document.getElementById("enable-intersections-generation").checked;
    const divisorCombination = parseInt(document.getElementById("distance-connection-intersections").value);
    distanceConnectionIntersections = Math.floor(width / divisorCombination);
}

function GetVariationsAttributes() {
    nbVariations = parseInt(document.getElementById("nb-variations").value);
    nbVariations = nbVariations > NB_VARIATIONS_MAX ? NB_VARIATIONS_MAX : nbVariations;
}

function GetColors() {

    if (areColorsGenerated) {
        shadingPercentage = parseInt(document.getElementById("shading-perc").value);
        defaultBaseSchemeColor = document.getElementById("base-scheme-color").value;

        defaultPlankColor = defaultBaseSchemeColor;
        darkerPlankColor = shadeColor(defaultPlankColor, shadingPercentage);
        outlinesPlankColor = shadeColor(darkerPlankColor, shadingPercentage - 5);
        intersectionColor = shadeColor(outlinesPlankColor, shadingPercentage - 2);

        return;
    }

    // if colors are defined manually
    defaultPlankColor = document.getElementById("light-plank-color").value;
    darkerPlankColor = document.getElementById("dark-plank-color").value;
    outlinesPlankColor = document.getElementById("delimitation-color").value;
    intersectionColor = document.getElementById("intersection-color").value;
}

const variationsDiv = document.getElementById("floor-variations");

function setVariationsStages() {
    // Clear the previous variations
    variationsStages = [];
    variationsDiv.textContent = '';

    for (let i = 0; i < nbVariations; i++) {
        // Create div for the current variation
        const id = `floor-variation-${i}`;
        const div = document.createElement("div");
        div.id = id;
        div.className = "mg-1";

        // Add the div to the HTML
        variationsDiv.appendChild(div);

        // Create a stage with the corresponding div
        const variationStage = new Konva.Stage({
            container: id,
            width: width,
            height: height
        })

        // Add the variation to the list of variations
        variationsStages.push(variationStage);
    }
}

function GlobalVariablesUpdate() {
    distanceBetweenPlanks = height / nbPlanks;

    stage = new Konva.Stage({
        container: 'floor-generation',
        width: width,
        height: height
    });
    previewStage = new Konva.Stage({
        container: 'floor-preview',
        width: width * previewScale,
        height: height * previewScale
    });

    setVariationsStages();
}

function UpdateOptions() {
    GetCanvasAttributes();
    GetPlankAttributes();
    GetVariationsAttributes();
    GetColors();
    GlobalVariablesUpdate();
}
//#endregion

//#region Download images
// function from https://stackoverflow.com/a/15832662/512042
function downloadURI(uri, name) {
    var link = document.createElement('a');
    link.download = name;
    link.href = uri;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    delete link;
}

function DownloadResult() {
    const seed = GetSeed();
    const dataUrl = stage.toDataURL();
    downloadURI(dataUrl, `result-${seed}.png`);
}

function DownloadVariations() {
    const seed = GetSeed();
    let i = 0;
    for (let stage of variationsStages) {
        const dataUrl = stage.toDataURL();
        downloadURI(dataUrl, `variation-${i}-${seed}.png`);
        i++;
    }
}

function DownloadPreview() {
    const seed = GetSeed();
    const dataUrl = previewStage.toDataURL();
    downloadURI(dataUrl, `preview-${seed}.png`);
}
//#endregion

//#region Event listeners
const colorSchemeDiv = document.getElementById("color-scheme");
const colorsDetailsDiv = document.getElementById("colors-details");

document.getElementById("manual-definition").addEventListener('click', () => {
    areColorsGenerated = false;
    colorSchemeDiv.hidden = true;
    colorsDetailsDiv.hidden = false;
})
document.getElementById("automatic-definition").addEventListener('click', () => {
    areColorsGenerated = true;
    colorSchemeDiv.hidden = false;
    colorsDetailsDiv.hidden = true;
})
document.addEventListener('keypress', (e) => {
    switch (e.code) {
        case 'Enter':
        case 'BracketLeft':
            GenerateSameFloorNewOptions();
            break;
        case 'BracketRight':
            GenerateFloor();
            break;
    }
})
//#endregion

//#region First generation, set things for Konva.js & global functions to generate
let stage = new Konva.Stage({
    container: 'floor-generation',
    width: width,
    height: height
});

let previewStage = new Konva.Stage({
    container: 'floor-preview',
    width: width * previewScale,
    height: height * previewScale
});

// Very first generation
GenerateFloor();

//#endregion
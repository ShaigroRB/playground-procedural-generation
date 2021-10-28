// ------- Define stuff
let width = 32;
let height = 32;
let nbPlanks = 8;

let areColorsGenerated = false;

// preview
const previewScale = 5;

let distanceBetweenPlanks = height / nbPlanks;
let defaultPlankColor = "#96704A";
let darkerPlankColor = "#916B44";
let delimPlankColor = "#815D34";
let intersectionColor = "#73532E";
let defaultBaseSchemeColor = "#96704A";

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

//#region Draw figures on canvas
/**
 * Draw horizontal delimitations for planks
 * @param {HTMLCanvasElement} canvas 
 * @param {number} distance 
 * @param {(start: {x: number, y: number}, end: {x: number, y: number}) => void} drawLine 
 */
function DrawHorizDelim(height, width, distance, drawLine) {
    let indexHeight = 0;

    while (indexHeight < height) {
        indexHeight += (distance - 1);

        // 0.5 are for anti-aliasing, cf MDN: 
        // https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors#a_linewidth_example
        const start = {
            x: 0,
            y: indexHeight + 0.5
        };
        const end = {
            x: width,
            y: indexHeight + 0.5
        };

        drawLine(start, end);
        indexHeight++;
    }
}

function DrawVertDelim(height, width, distance, nextNumber, drawLine) {
    let indexHeight = 0;
    let intersections = [];

    while (indexHeight < height) {
        let x = Math.floor(width * nextNumber());

        // anti-aliasing fix
        x += 0.5;

        // from top to bottom
        const start = {
            x: x,
            y: indexHeight - 1
        };
        const end = {
            x: x,
            y: indexHeight + (distance - 1)
        };

        drawLine(start, end);
        indexHeight += distance;

        // add new intersections
        intersections = [
            ...intersections,
            [start, end]
        ];
    }

    return intersections;
}

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

function GeneratePreview(stageWidth, stageHeight, group, previewStage, scale) {
    previewStage.destroyChildren();
    previewStage.clear();

    let layer = new Konva.Layer();

    for (let x = 0; x < stageWidth * scale; x += stageWidth) {
        for (let y = 0; y < stageHeight * scale; y += stageHeight) {
            const newGroup = group.clone({
                x: x,
                y: y
            });
            layer.add(newGroup);
        }
    }

    previewStage.add(layer);
}

function DrawKonvaLetterT(group, color) {
    const drawLine = DrawKonvaLine(group, color);

    return function (leftPoint, rightPoint, centerPoint, bottomPoint) {
        drawLine(leftPoint, rightPoint);
        drawLine(centerPoint, bottomPoint);
    }
}

function CreatePoint(x, y) {
    return {
        x: x,
        y: y
    };
}

function UpdatePoint(point, x, y) {
    point.x = x;
    point.y = y;
}

function DrawIntersections(intersections, nextNumber, drawLetterT) {
    let leftPoint = CreatePoint(0, 0);
    let rightPoint = CreatePoint(0, 0);
    let centerPoint = CreatePoint(0, 0);
    let bottomPoint = CreatePoint(0, 0);

    const getTopPoint = (intersection) => intersection[0];
    const getBottomPoint = (intersection) => intersection[1];

    intersections.forEach((intersection) => {
        const isIntersection = nextNumber() < 0.5;

        if (!isIntersection) {
            return;
        }

        const isIntersectionTop = nextNumber() > 0.5;

        if (isIntersectionTop) {
            const tmpVertiPoint = getTopPoint(intersection);
            UpdatePoint(centerPoint, tmpVertiPoint.x, tmpVertiPoint.y);
            UpdatePoint(bottomPoint, tmpVertiPoint.x, tmpVertiPoint.y + 2);
        } else {
            const tmpVertiPoint = getBottomPoint(intersection);
            UpdatePoint(centerPoint, tmpVertiPoint.x, tmpVertiPoint.y);
            UpdatePoint(bottomPoint, tmpVertiPoint.x, tmpVertiPoint.y - 2);
        }

        const leftSpreading = Math.floor((nextNumber() / 0.30)) + 2;
        const rightSpreading = Math.floor((nextNumber() / 0.30)) + 2;

        //anti-aliasing fix
        const tmpHorizPoint = CreatePoint(centerPoint.x - 0.5, centerPoint.y + 0.5);

        UpdatePoint(leftPoint, tmpHorizPoint.x - leftSpreading, tmpHorizPoint.y);
        UpdatePoint(rightPoint, tmpHorizPoint.x + rightSpreading, tmpHorizPoint.y);

        drawLetterT(leftPoint, rightPoint, centerPoint, bottomPoint);
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

//#region Generate the floor texture using a seed
function Generate(seed) {
    document.getElementById("input-seed").value = seed;
    const genRnd = new Math.seedrandom(seed);

    let layer = new Konva.Layer();
    let group = new Konva.Group();

    const drawKonvaRectLightPlankColor = DrawKonvaRect(group, defaultPlankColor);
    const drawKonvaRectDarkPlankColor = DrawKonvaRect(group, darkerPlankColor);
    const drawKonvaLine = DrawKonvaLine(group, delimPlankColor);
    const drawKonvaLetterT = DrawKonvaLetterT(group, intersectionColor);

    DrawPlanks(
        height, width,
        distanceBetweenPlanks, genRnd,
        drawKonvaRectLightPlankColor, drawKonvaRectDarkPlankColor
    );

    DrawHorizDelim(height, width, distanceBetweenPlanks, drawKonvaLine);
    const intersections = DrawVertDelim(height, width, distanceBetweenPlanks, genRnd, drawKonvaLine);
    DrawIntersections(intersections, genRnd, drawKonvaLetterT);

    layer.add(group);
    stage.add(layer);
    layer.draw();

    GeneratePreview(width, height, group, previewStage, previewScale);
}

function Clear() {
    stage.destroyChildren();
    stage.clear();
}
//#endregion

//#region Get options values from the HTML
function GetCanvasAttributes() {
    width = parseInt(document.getElementById("canvas-width").value);
    height = parseInt(document.getElementById("canvas-height").value);
}

function GetPlankAttributes() {
    nbPlanks = parseInt(document.getElementById("nb-planks").value);
}

/**
 * https://stackoverflow.com/a/13532993
*/ 
function shadeColor(color, percent) {

    var R = parseInt(color.substring(1,3),16);
    var G = parseInt(color.substring(3,5),16);
    var B = parseInt(color.substring(5,7),16);

    R = parseInt(R * (100 + percent) / 100);
    G = parseInt(G * (100 + percent) / 100);
    B = parseInt(B * (100 + percent) / 100);

    R = (R<255)?R:255;  
    G = (G<255)?G:255;  
    B = (B<255)?B:255;  

    var RR = ((R.toString(16).length==1)?"0"+R.toString(16):R.toString(16));
    var GG = ((G.toString(16).length==1)?"0"+G.toString(16):G.toString(16));
    var BB = ((B.toString(16).length==1)?"0"+B.toString(16):B.toString(16));

    return "#"+RR+GG+BB;
}

function GetColors() {

    if (areColorsGenerated) {
        defaultBaseSchemeColor = document.getElementById("base-scheme-color").value;
        
        defaultPlankColor = defaultBaseSchemeColor;
        darkerPlankColor = shadeColor(defaultPlankColor, -5);
        delimPlankColor = shadeColor(darkerPlankColor, -10);
        intersectionColor = shadeColor(delimPlankColor, -5);

        return;
    }

    // if colors are defined manually
    defaultPlankColor = document.getElementById("light-plank-color").value;
    darkerPlankColor = document.getElementById("dark-plank-color").value;
    delimPlankColor = document.getElementById("delimitation-color").value;
    intersectionColor = document.getElementById("intersection-color").value;
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
}

function UpdateOptions() {
    GetCanvasAttributes();
    GetPlankAttributes();
    GetColors();
    GlobalVariablesUpdate();
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

function GenerateFloor(seed = MakeID(10)) {
    UpdateOptions();

    Clear();
    Generate(seed);
}

function GenerateSameFloorNewOptions() {
    const seed = document.getElementById("input-seed").value;
    GenerateFloor(seed);
}

// Very first generation
Generate(MakeID(10));

//#endregion
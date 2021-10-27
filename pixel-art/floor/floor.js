// ------- Define stuff
let width = 32;
let height = 32;
const nbPlanks = 8;

// preview
const previewScale = 5;

let distanceBetweenPlanks = height / nbPlanks;
const defaultPlankColor = "#96704A";
const darkerPlankColor = "#916B44";
const delimPlankColor = "#815D34";
const intersectionColor = "#73532E";

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
function GetCanvasSizes() {
    width = parseInt(document.getElementById("canvas-width").value);
    height = parseInt(document.getElementById("canvas-height").value);
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
    GetCanvasSizes();
    GlobalVariablesUpdate();
}
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
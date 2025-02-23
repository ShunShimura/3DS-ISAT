(() => { // 即時関数
    
    // parameters
    const extensions = ["jpg", "jpeg", "png", "JPG", "JPEG", "PNG"]
    const minZoom = 0.1
    const maxZoom = 10
    const zoomSpeed = 1.1

    // main containers
    let canvas = null
    let images = {}
    let colors = {
        0: [0, 0, 0, 0]
    } // id: color
    let segmentationMasks = {}

    // main variables
    let currentImage = null
    let currentId = 0
    let segmentShow = true
    let lineWidth = 10
    let preCurrentId = 0
    let fill = false

    // Scaling variables
    let scale = 0.3
    let canvasX = 0
    let canvasY = 0
    let screenX = 0
    let screenY = 0

    // Mouse container
    const mouse = {
        x: 0, // on screen
        y: 0, // on screen 
        realX: 0, // on image or canvas
        realY: 0, // on image or canvas
        buttonL: false, // for draw segment
        buttonR: false, // for move image
    }

    let flag = true

    // 右クリックをoffにする
    document.addEventListener('contextmenu', (e) =>{
        e.preventDefault();
    }, false);

    // ここから全体の流れ
    document.onreadystatechange = () => { // readystateというdocumentのプロパティが変更されたときに実行される内容を記述
        if (document.readyState === "complete") { // loading, interactive, completeの3つがある
            listenImageLoad()
            listenImageSelect()
            listenCanvas()
            listenCanvasMouse()
            listenClassGenerate()
            listenClassSelect()
            listenSegmentationMasks()
            listenImageAdjustment()
            listenSegmentationSave()
        }
    };

    //################################################################################################
    //######################################### listenImageLoad & listenImageSelect ##################
    //################################################################################################

    const listenImageLoad = () => {
        document.getElementById("images").addEventListener("change", (e) => {
            const imageList = document.getElementById("imageList")
            let saveSegmentationMasks = document.getElementById("saveSegmentationMasks")
            let generateClass = document.getElementById("generateClass")
            let loadMasks = document.getElementById("loadMasks")
            let fillMode = document.getElementById("fillMode")
            const files = e.target.files

            if (files.length > 0) {
                resetImageList()

                document.body.style.cursor = "wait"

                // load images one by one
                // to wait all properties loadings, use a counter
                let async = files.length
                for (let i=0; i < files.length; i++) {
                    const nameParts = files[i].name.split(".")
                    const key = files[i].name
                    if (extensions.indexOf(nameParts[nameParts.length-1]) !== -1) {
                        // add to "images"
                        images[files[i].name] = {
                            meta: files[i],
                            index: i
                        }
                        // add image object and w, h to "images"
                        const reader = new FileReader()
                        reader.addEventListener("load", (e) => {
                            const dataUrl = e.target.result
                            const imageObject = new Image()
                            imageObject.addEventListener("load", (e) => {
                                images[key].width = e.target.width
                                images[key].height = e.target.height
                                // when all images are read
                                if (--async === 0) {
                                    // create imageData for all images
                                    createImageData()
                                    // create segmentationMask for all images ( ※ do not use this for maskData for sake of process-speed)
                                    createSegmentationMask()
                                    // create initial maskedImageData
                                    createInitialMaskedImageData()
                                    // set default image to currentImage
                                    setCurrentImage(images[Object.keys(images)[0]])
                                    // able some buttons to be clicked
                                    saveSegmentationMasks.disabled = false
                                    generateClass.disabled = false
                                    loadMasks.disabled = false
                                    // fillMode.disabled = false
                                    document.body.style.cursor = "default"

                                }
                            })
                            // imageObject's event handler 
                            images[key].object = imageObject
                            imageObject.src = dataUrl
                        })
                        // reader's event handler
                        reader.readAsDataURL(images[key].meta)
                        // option in select-tag 
                        const option = document.createElement("option")
                        option.value = key 
                        option.innerHTML = key
                        // default setup
                        if (i === 0) {
                            option.selected = true
                        }
                        imageList.appendChild(option)
                    }
                }
            }
        })
    };

    const resetImageList = () => {
        const imageList = document.getElementById("imageList")
        imageList.innerHTML = ""
        images = {}
        currentImage = null
    };

    const createImageData = () => {
        for (let key in images) {
            const width = images[key].width
            const height = images[key].height
            const canvas = document.getElementById("canvas")
            canvas.width = width
            canvas.height = height
            const context = canvas.getContext("2d")
            context.drawImage(images[key].object, 0, 0, width, height)
            images[key].imageData = context.getImageData(0, 0, width, height).data
            // canvas.remove()
        }
    };   
    
    const createSegmentationMask = () => {
        for (let key in images) {
            const width = images[key].width
            const height = images[key].height
            const segmentationMask = Array.from({length: height}, () => Array(width).fill(0))
            segmentationMasks[images[key].meta.name] = segmentationMask
        }
    };

    const createInitialMaskedImageData = () => {
        for (let key in images) {
            const width = images[key].width
            const height = images[key].height
            images[key].maskedImageData = new Uint8ClampedArray(width * height * 4)
            for (let i=0; i<width*height*4; i++) {
                images[key].maskedImageData[i] = images[key].imageData[i]
            }
        }
    };

    const setCurrentImage = (image) => {
        // make current variable
        currentImage = {
            name: image.meta.name,
            width: image.width,
            height: image.height,
            maskedImageData: image.maskedImageData
        }

        // highlight currentId's segments
        hightlightCurrentId(currentId)
    };

    const listenImageSelect = () => {
        const imageList = document.getElementById("imageList")

        imageList.addEventListener("change", () => {
            const name = imageList.options[imageList.selectedIndex].innerHTML
            setCurrentImage(images[name])
        })
    };

    //################################################################################################
    //######################################### listenCanvas #########################################
    //################################################################################################

    const listenCanvas = () => {
        canvas = new Canvas("canvas", document.getElementById("right").clientWidth, window.innerHeight)

        // always update drawing
        canvas.on("draw", (context) => {
            // if currentImage is null, display introduction
            canvas.width = document.getElementById("right").clientWidth
            canvas.height = window.innerHeight
            if (currentImage === null) {
                drawIntro(context)
            }
            else {
                drawMaskedImage(context, currentImage.maskedImageData)
                drawNib(context)
            }
        }).start()
    };

    const drawNib = (context) => {
        if (-1 < mouse.x && mouse.x < canvas.width && -1 < mouse.y && mouse.y < canvas.height) {
            context.strokeStyle = "white"
            context.lineWidth = 1
            context.beginPath()
            context.arc(mouse.x, mouse.y, lineWidth, 0, Math.PI * 2)
            context.stroke()
        }
    };

    const drawMaskedImage = (context, adjustedImageData) => {
        // create imageData (all elements equals to 0)
        let imageData = context.createImageData(canvas.width, canvas.height)
        for (let i=0; i<canvas.width*canvas.height; i++) {
            const x = i%canvas.width
            const y = Math.floor(i/canvas.width)
            const dataX = zoomXInv(x)
            const dataY = zoomYInv(y)
                if (-1 < dataX && dataX < currentImage.width && -1 < dataY && dataY < currentImage.height) {
                const firstIndex = 4 * (x + imageData.width * y)
                const dataFirstIndex = 4 * (dataX + currentImage.width * dataY)
                // R
                imageData.data[firstIndex] = adjustedImageData[dataFirstIndex]
                // G
                imageData.data[firstIndex + 1] = adjustedImageData[dataFirstIndex + 1]
                // B
                imageData.data[firstIndex + 2] = adjustedImageData[dataFirstIndex + 2]
                // A
                imageData.data[firstIndex + 3] = adjustedImageData[dataFirstIndex + 3]
            }
        }
        context.putImageData(imageData, 0, 0)
    };

    const drawIntro = (context) => {

    };

    //################################################################################################
    //######################################### listenCanvasMouse ####################################
    //################################################################################################

    const listenCanvasMouse =  () => {
        // draw mode or fill mode
        let fillMode = document.getElementById("fillMode")
        fillMode.addEventListener("click", (e) => {
            if (e.target.textContent === "Fill ON" && currentId !== 0) {
                fill = true
                e.target.textContent = "Fill OFF"
            }
            else {
                fill = false
                e.target.textContent = "Fill ON"
            }
        })

        canvas.element.addEventListener("wheel", trackWheel, {passive: false})
        canvas.element.addEventListener("mousemove", trackMovement)
        canvas.element.addEventListener("mousedown", trackSwitch)
        canvas.element.addEventListener("mouseup", trackSwitch)
        canvas.element.addEventListener("mouseout", trackOut)
    };

    const trackWheel = (e) => {
        // update reference points
        screenX = mouse.x
        screenY = mouse.y
        canvasX = mouse.realX
        canvasY = mouse.realY

        // change scale
        if (e.deltaY < 0 && scale+0.1 < maxZoom) {
            scale = Math.min(maxZoom, scale * zoomSpeed)
        }
        if (e.deltaY > 0 && minZoom < scale) {
            scale = Math.max(minZoom, scale * (1/zoomSpeed))
        }

        // avoid defaule behavier
        e.preventDefault()
    };

    const trackMovement = (e) => {
        // update mose coordinates (with save old's)
        const bounds = canvas.element.getBoundingClientRect()
        const oldScreenX = mouse.x
        const oldScreenY = mouse.y
        const oldRealX = zoomXInv(oldScreenX)
        const oldRealY = zoomYInv(oldScreenY)
        mouse.x = e.clientX - bounds.left
        mouse.y = e.clientY - bounds.top
        mouse.realX = zoomXInv(mouse.x)
        mouse.realY = zoomYInv(mouse.y)

        // if buttonR is being on, shift images
        if (mouse.buttonR === true) {
            // change where (canvasX, canvasY) is drawn on screen
            screenX += mouse.x - oldScreenX
            screenY += mouse.y - oldScreenY
        } 

        // if buttonR is being on, draw segments
        if (mouse.buttonL === true && currentId !== null && fill === false) {

            // draw pixes on path
            const absoluteTangent = Math.abs(mouse.realY-oldRealY) / Math.abs(mouse.realX-oldRealX)
            const xSign = Math.sign(mouse.realX-oldRealX)
            const ySign = Math.sign(mouse.realY-oldRealY)
            // add 1.0 along x
            if (absoluteTangent < 1) {
                for (let i=0; i < Math.abs(mouse.realX-oldRealX); i++) {
                    const x = Math.floor(oldRealX + xSign*i)
                    const y = Math.floor(oldRealY + ySign*i*absoluteTangent)
                    addSegment(x, y)
                }
            }
            // add 1.0 along y
            else {
                for (let i=0; i < Math.abs(mouse.realY-oldRealY); i++) {
                    const x = Math.floor(oldRealX + xSign*i*(1/absoluteTangent))
                    const y = Math.floor(oldRealY + ySign*i)
                    addSegment(x, y)
                }
            }
            // reached point
            addSegment(mouse.realX, mouse.realY)
        }
    };

    const trackSwitch = (e) => {
        if (e.type === "mousedown") {
            if (e.which === 3) {
                mouse.buttonR = true
            }
            else if (e.which === 1) {
                mouse.buttonL = true
                if (currentId !== null) {
                    if (fill) {
                        console.log(fillSegment(mouse.realX, mouse.realY))
                    }
                    else {
                        // add segment to maskedImageData, segmentataion-mask
                        addSegment(mouse.realX, mouse.realY)
                    }
                }
            }
        }
        else {
            if (e.which === 3) {
                mouse.buttonR = false
            }
            else if (e.which === 1) {
                mouse.buttonL = false
            }
        }
    };

    const trackOut = () => {
        mouse.buttonL = false
        mouse.buttonR = false
    };

    const addSegment = (centerX, centerY) => {
        const segmentRange = Math.max(zoomInv(lineWidth), 1)
        for (let i=0; i<Math.pow(2 * segmentRange + 1, 2); i++) {
            const dataX =  centerX + (i % (2 * segmentRange + 1) - segmentRange)
            const dataY = centerY + (Math.floor(i / (2 * segmentRange + 1)) - segmentRange)
            if (-1 < dataX && dataX < currentImage.width && -1 < dataY && dataY < currentImage.height) {
                const distance = Math.sqrt(Math.pow(dataX - centerX, 2) + Math.pow(dataY - centerY, 2))
                if (distance < segmentRange) {
                    if (segmentationMasks[currentImage.name][dataY][dataX] !== currentId) {
                        // blending
                        const imageData = images[currentImage.name].imageData
                        const dataFirstIndex = 4 * (dataX + currentImage.width * dataY)
                        const NormalizedMaskAlpha = colors[currentId][3] * 1.5 / 255
                        const NormalizedImageAlpha = imageData[dataFirstIndex + 3] / 255
                        // A
                        currentImage.maskedImageData[dataFirstIndex + 3] = (NormalizedMaskAlpha * colors[currentId][3] * 1.5 + (1 - NormalizedMaskAlpha) * imageData[dataFirstIndex + 3])
                        // R
                        currentImage.maskedImageData[dataFirstIndex] = 255 * ((NormalizedMaskAlpha * colors[currentId][0] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex]) / currentImage.maskedImageData[dataFirstIndex + 3])
                        // G
                        currentImage.maskedImageData[dataFirstIndex + 1] = 255 * ((NormalizedMaskAlpha * colors[currentId][1] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex + 1]) / currentImage.maskedImageData[dataFirstIndex + 3])
                        // B
                        currentImage.maskedImageData[dataFirstIndex + 2] = 255 * ((NormalizedMaskAlpha * colors[currentId][2] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex + 2]) / currentImage.maskedImageData[dataFirstIndex + 3])

                        // change mask
                        segmentationMasks[currentImage.name][dataY][dataX] = currentId
                    }
                }
            }
        }
    };

    const fillSegment = (realX, realY) => {
        const mask = segmentationMasks[currentImage.name]
        // if start point is in drawn area, finish this function
        if (mask[realY][realX] === currentId){
            return false
        }

        // search candidates
        let unchecked = {
            [`${realX}, ${realY}`]: null
        }
        let candidates = {}
        console.time("search")
        while (Object.keys(unchecked).length !== 0) {
            // randomly select one point from unchecked
            const keys = Object.keys(unchecked)
            const key = keys[keys.length-1]
            const checkX = Number(key.split(",")[0])
            const checkY = Number(key.split(",")[1])
            // if a candidate reaches edge of image, region is not closed -> return 
            if (checkX === 0 || checkX === currentImage.width -1 || checkY === 0 || checkY === currentImage.height - 1) {
                return false
            }
            delete unchecked[key]
            // add surrounding points to unchecked if it satisfies some conditions 
            const checkAlignment = [[-1, 0], [1, 0], [0, 1], [0, -1]]
            for (let i=0; i<checkAlignment.length; i++) {
                // conditions: mask is not currentId, not included to unchecked, not included to candidates
                const x = checkX + checkAlignment[i][0]
                const y = checkY + checkAlignment[i][1]
                if (mask[y][x] !== currentId && unchecked[`${x},${y}`] === undefined && candidates[`${x},${y}`] === undefined) {
                    unchecked[`${x},${y}`] = null
                }
            }
            // add candidates that will be drawn later
            candidates[key] = null
        }
        console.timeEnd("search")
        console.log(Object.keys(candidates).length)
    };

    //################################################################################################
    //######################################### listenClass ####################################
    //################################################################################################

    const listenClassGenerate = () => {
        const generateClass = document.getElementById("generateClass")
        const classList = document.getElementById("classList")
        const currentIdShow = document.getElementById("currentIdShow")
        generateClass.addEventListener("click", () => {
            const newId = Object.keys(colors).length

            // make random color
            const randomValue = () => Math.floor(Math.random() * 256)
            const r = randomValue()
            const g = randomValue()
            const b = randomValue()
            colors[newId] = [r, g, b, 64]

            // turn off all options old
            for (let i = 0; i < classList.options.length; i++) {
                classList.options[i].selected = false
            }

            // add option to classList
            const option = document.createElement("option")
            option.value = newId
            option.style.color = colorString(colors[newId])
            option.innerHTML = "ID " + newId + ": " + colors[newId]
            option.selected = true
            classList.appendChild(option)

            // set newid for current id
            currentId = newId
            currentIdShow.textContent = `ID: ${currentId}`

            // de-hightlight non-currentId's segments
            hightlightCurrentId(currentId)
        })
    };

    const listenClassSelect = () => {
        // instances
        const classList = document.getElementById("classList")
        const currentIdShow = document.getElementById("currentIdShow")
        classList.addEventListener("change", (e) => {
            currentId = Number(e.target.value)
            // de-hightlight non-currentId's segments
            hightlightCurrentId(currentId)
            const eraser = document.getElementById("eraser")
            if (eraser.textContent === "Eraser OFF") {
                eraser.textContent = "Eraser ON"
            }
            currentIdShow.textContent = `ID: ${currentId}`
        })

        // eraser
        const eraser = document.getElementById("eraser")
        eraser.addEventListener("click", () => {
            if (currentId === 0) {
                // eraser off
                currentId = preCurrentId
                eraser.textContent = "Eraser ON"
                currentIdShow.textContent = `ID: ${currentId}`
            }
            else {
                // eraser on
                preCurrentId = currentId
                currentId = 0
                eraser.textContent = "Eraser OFF"
                currentIdShow.textContent = `ID: 0 (Eraser)`
            }
            // de-hightlight non-currentId's segments
            hightlightCurrentId(currentId)
        })

    };

    const hightlightCurrentId = (inputId) => {
        const mask = segmentationMasks[currentImage.name]
        const width = currentImage.width
        const height = currentImage.height
        for (let i=0; i<width*height; i++) {
            const dataX = i % width
            const dataY = Math.floor(i / width)
            const id = mask[dataY][dataX]
            if (id !== 0) {
                // blending
                let maskAlpha = colors[id][3]
                if (id === inputId){
                    maskAlpha = colors[id][3] * 1.5
                }
                let maskedImageData = currentImage.maskedImageData
                const imageData = images[currentImage.name].imageData
                const dataFirstIndex = 4 * (dataX + currentImage.width * dataY)
                const NormalizedMaskAlpha = maskAlpha / 255
                const NormalizedImageAlpha = imageData[dataFirstIndex + 3] / 255
                // A
                maskedImageData[dataFirstIndex + 3] = (NormalizedMaskAlpha * maskAlpha + (1 - NormalizedMaskAlpha) * imageData[dataFirstIndex + 3])
                // R
                maskedImageData[dataFirstIndex] = 255 * ((NormalizedMaskAlpha * colors[id][0] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex]) / maskedImageData[dataFirstIndex + 3])
                // G
                maskedImageData[dataFirstIndex + 1] = 255 * ((NormalizedMaskAlpha * colors[id][1] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex + 1]) / maskedImageData[dataFirstIndex + 3])
                // B
                maskedImageData[dataFirstIndex + 2] = 255 * ((NormalizedMaskAlpha * colors[id][2] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex + 2]) / maskedImageData[dataFirstIndex + 3])
            }
        }
    };

    //################################################################################################
    //######################################### Segmentation Mask load ####################################
    //################################################################################################

    const listenSegmentationMasks = () => {
        const loadMasks = document.getElementById("loadMasks")
        loadMasks.addEventListener("change", (e) => {
            const files = e.target.files

            if (files.length > 0) {

                const masksList = document.getElementById("masksList")
                let async = files.length
                document.body.style.cursor = "wait"
                for (let i=0; i<files.length; i++) {

                    // create options that wiil be added to select-tag
                    const option = document.createElement("option")
                    option.innerHTML = files[i].name
                    masksList.appendChild(option)

                    // declare event handlers to load segmentation-masks
                    const reader = new FileReader()
                    const loadExtension = files[i].name.split(".").pop()
                    reader.addEventListener("load", () => {
                        storeSegmentationMask(files[i].name, reader.result)
                        if (--async === 0) {
                            document.body.style.cursor = "default"
                            calculateMaskedImageData()
                        }
                    })

                    // event handler
                    if (loadExtension === "txt") {
                        reader.readAsText(files[i])
                    }
                }
            }
        })
    };

    const storeSegmentationMask = (filename, text) => {
        const loadExtension = filename.split(".").pop()
        const classList = document.getElementById("classList")
        // loop for image extensions that has the same stem to loaded masks
        for (let i=0; i<extensions.length; i++) {
            const imageName = filename.replace(`.${loadExtension}`, `.${extensions[i]}`)

            // if the image that has the same stem is found
            if (typeof images[imageName] !== undefined) {

                // If size is matched completely
                const loadArray = text
                    .trim()
                    .split("\n")
                    .map(line => line.split(",").map(Number))

                if (loadArray.length === images[imageName].height && loadArray[0].length === images[imageName].width) {
                    segmentationMasks[imageName] = loadArray
                    // generate colors before read it on storeMaskedImageData
                    for (let i=0; i<loadArray.length*loadArray[0].length; i++) {
                        const x = i % loadArray[0].length
                        const y = Math.floor(i / loadArray.length)
                        const id = loadArray[y][x]
                        if (id !== 0 && colors[id] === undefined) {
                            const randomValue = () => Math.floor(Math.random() * 256)
                            const r = randomValue()
                            const g = randomValue()
                            const b = randomValue()
                            colors[id] = [r, g, b, 64]
                            // add option to classList
                            const option = document.createElement("option")
                            option.value = id
                            option.style.color = colorString(colors[id])
                            option.innerHTML = "ID " + id + ": " + colors[id]
                            classList.appendChild(option)
                        }
                    }
                    return true
                }
                else {
                    return false
                }
            }
        }
    };

    const calculateMaskedImageData = () => {
        for (key in images) {
            if (images[key].imageData !== undefined && segmentationMasks[key] !== undefined) {
                const width = images[key].width
                const height = images[key].height
                let maskedImageData = new Uint8ClampedArray(width * height * 4)
                const imageData = images[key].imageData
                for (let i=0; i<width*height; i++) {
                    const dataX = i % width
                    const dataY = Math.floor(i / width)
                    const id = segmentationMasks[key][dataY][dataX]
                    const dataFirstIndex = 4 * (dataX + width * dataY)
                    if (id !== 0) {
                        // blending
                        let maskAlpha = colors[id][3]
                        if (id === currentId){
                            maskAlpha = colors[id][3] * 1.5
                        }
                        const NormalizedMaskAlpha = maskAlpha / 255
                        const NormalizedImageAlpha = imageData[dataFirstIndex + 3] / 255
                        // A
                        maskedImageData[dataFirstIndex + 3] = (NormalizedMaskAlpha * maskAlpha + (1 - NormalizedMaskAlpha) * imageData[dataFirstIndex + 3])
                        // R
                        maskedImageData[dataFirstIndex] = 255 * ((NormalizedMaskAlpha * colors[id][0] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex]) / maskedImageData[dataFirstIndex + 3])
                        // G
                        maskedImageData[dataFirstIndex + 1] = 255 * ((NormalizedMaskAlpha * colors[id][1] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex + 1]) / maskedImageData[dataFirstIndex + 3])
                        // B
                        maskedImageData[dataFirstIndex + 2] = 255 * ((NormalizedMaskAlpha * colors[id][2] + (1 - NormalizedMaskAlpha) * NormalizedImageAlpha * imageData[dataFirstIndex + 2]) / maskedImageData[dataFirstIndex + 3])
                    }
                    else {
                        // R
                        maskedImageData[dataFirstIndex] = imageData[dataFirstIndex]
                        // G
                        maskedImageData[dataFirstIndex + 1] = imageData[dataFirstIndex + 1]
                        // B
                        maskedImageData[dataFirstIndex + 2] = imageData[dataFirstIndex + 2]
                        // A
                        maskedImageData[dataFirstIndex + 3] = imageData[dataFirstIndex + 3]
                    }
                }
                images[key].maskedImageData = maskedImageData
            }
            if (currentImage.name === key) {
                setCurrentImage(images[key])
            }
        }
    };

    //################################################################################################
    //######################################### Segmentation Save ####################################
    //################################################################################################

    const listenSegmentationSave = () => {
        const segmentationMaskSave = document.getElementById("saveSegmentationMasks")
        segmentationMaskSave.addEventListener("click", () => {
            console.log("Saving ...")
            const zip = new JSZip()

            // save for each image
            for (key in segmentationMasks) {
                const mask = segmentationMasks[key]
                // change extension
                const name = key.split(".")
                name[name.length - 1] = "txt"
                // save
                const result = mask.map(row => row.join(',')).join('\n');
                zip.file(name.join("."), result)
            }

            // save as zip file
            zip.generateAsync({type: "blob"}).then((blob) => {
                saveAs(blob, "segmentation_mask.zip")
                console.log("Done !")
            })
        })        
    };


    //################################################################################################
    //######################################### Zooming ##############################################
    //################################################################################################

    /*
    Zoom: mapping coordinates on image or canvas to on screen 
        canvasX, canvasY: reference point on image or canvas
        screenX, screenY: where (canvasX, canvasY) is drawn on screen 
    */

    // pixel to screen
    const zoom = (number) => {
        return Math.floor(number*scale)
    };
    const zoomX = (number) => {
        return Math.floor((number - canvasX) * scale + screenX)
    };
    const zoomY = (number) => {
        return Math.floor((number - canvasY) * scale + screenY)
    };

    // screen to pixel
    const zoomInv = (number) => {
        return Math.floor(number * (1/scale))
    };
    const zoomXInv = (number) => {
        return Math.floor((number - screenX) * (1/scale) + canvasX)
    };
    const zoomYInv = (number) => {
        return Math.floor((number - screenY) * (1/scale) + canvasY)
    };

    //################################################################################################
    //######################################### Misc ##############################################
    //################################################################################################

    const listenImageAdjustment = () => {
        const lineWidthSlider = document.getElementById("lineWidth")
        const lineWidthValue = document.getElementById("lineWidthValue")
      
        lineWidthSlider.addEventListener('input', (e) => {
            lineWidth = e.target.value
            lineWidthValue.textContent = lineWidth
        })
    };

    const colorString = (rgb) => {
        return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 1.0)`
    };

})()
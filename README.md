# 3DS-ISAT ( 3D-Stacked-Instance-Segmentation-Annotation-Tool )

## What is "3D-Stacked Instance Segmeantation" ?
Input is stacked 2D-images that slices 3D-space at each z-plane. Then the output from 3D-Stacked Instance Segmentation (3DS-IS) are obtained as 3D-stacked masks that clarify the regions of each instances. Especially, outputted labels on each masks are consistent over all sliced images.
<p align="center">
  <img src="figures/3DS-IS_image.svg" width=80%>
</p>

## How to use

### 1. Open the HTML

Access to html page by double clicking the `isat.html`.
<p align="center">
    <img src="figures/initial.png" width=80%>
</p>

### 2. Image upload

Upload multiple images ordered by `z` (ascending or decending is OK) by multi-select (on mac, `cmd` + click or `shift` + click). This application supports `.jpg`, `.jpeg` and `.png`.

<p align="center">
    <img src="figures/image_upload.png" width=80%>
</p>
Then dialog will be open and you can select images.
<p align="center">
    <img src="figures/image_dialog.png" width=80%>
</p>
And you can switch the image by selecting an image in the list.
<p align="center">
    <img src="figures/image_select.png" width=80%>
</p>

### 3. Generate and select ID 

Before you annotate regions, you need to push `Generate ID` to begin annotation. Of course each ID corresponds each instances. 
<p align="center">
    <img src="figures/push_generateID.png" width=80%>
</p>

The case below indicates the bottom have pushed three times.
<p align="center">
    <img src="figures/generated.png" width=80%>
</p>

where `ID:3` is selected. And colors and three values like `(*, *, *, *)` indicate the color `(R, G, B, A)` used when drawing. 

# Draw segmentation mask

When you hold clicking, the line whose color is what selected on step 3 is drawn. 
<p align="center">
    <img src="figures/drawing.png" width=80%>
</p>

If you want to erase drawn lines, push the botton `Eraser ON` and hold clicking where you want to do so. 
<p align="center">
    <img src="figures/eraser_on.png" width=80%>
    <img src="figures/erasing.png" width=80%>
</p>

### 4. Save segmentation-mask

When you want to save annotations (even when you want to pause and save interim results), push the `save segmentations`. Then you will obtained array-like text files named the same to original images. The values on saved text files indicates labels (0 means background and others are instances). 
<p align="center">
    <img src="figures/saving.png" width=80%>
</p>

### Mores 

1. Change the scale: When scorolling the mouse, you can close up or pull back.

2. Change the size of draw: The scroll bar in left side changes the size.

3. Restart the annotation: `Choose file` on `Segmentation Mask` can load what you had annotated.


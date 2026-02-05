HexAct Architecture
===================

System Overview
---------------

HexAct is a client-side computer vision application built entirely with web technologies.
All processing happens in the browser without server dependencies.

.. diagram::

    [Webcam] --> [Video Element] --> [Canvas] --> [OpenCV.js] --> [Detection Pipeline] --> [UI]

Core Components
---------------

1. Video Acquisition Layer
   - Uses WebRTC via ``navigator.mediaDevices.getUserMedia()``
   - Constraints: 560x420 resolution (optimal for real-time processing)
   - Frame rate: browser-dependent (~15-30 FPS)

2. Preprocessing Module
   - Color conversion: RGBA → Grayscale
   - Background subtraction (optional, user-calibrated)
   - Adaptive thresholding with Otsu's method
   - Median/Gaussian blur for noise reduction

3. Detection Pipeline
   - **Shape Detection** (``detectAllShapes``):
     * Contour extraction via ``cv.findContours()``
     * Polygon approximation with ``cv.approxPolyDP()``
     * Vertex counting (4-8 vertices)
     * Regularity analysis for hexagons
   
   - **Cross Detection** (``detectPhillipsAndCircles``):
     * Circle detection via Hough Transform (``cv.HoughCircles``)
     * Line detection within ROI (``cv.HoughLinesP``)
     * Cross validation by angle analysis (85°–95°)

4. Object Tracking
   - Simple centroid-based tracker
   - Parameters:
     * ``SIMILARITY_DIST = 35`` px (max distance between frames)
     * ``MIN_FRAMES_TO_REPORT = 3`` (stability requirement)
     * ``FORGET_AFTER_MS = 2500`` (object expiration)
   - Prevents duplicate detections of same physical object

5. Classification Logic
   - Tab-based context (bolts vs nuts mode)
   - Confidence scoring based on:
     * Geometric regularity
     * Size consistency
     * Cross presence/absence
   - Categories:
     * ``ok`` — correct fastener type
     * ``warning`` — unknown but acceptable shape
     * ``reject`` — wrong shape/type

6. UI/UX Layer
   - Real-time canvas overlay with bounding boxes
   - Color coding:
     * Green (#00ff00) — accepted
     * Orange (#ffaa00) — warning
     * Red (#ff0000) — rejected
   - Statistics dashboard with bar charts
   - Session history with sortable items
   - CSV export and printable reports

Data Flow
---------

1. Frame capture → Canvas draw
2. Canvas → ImageData → cv.Mat (RGBA)
3. RGBA → Grayscale conversion
4. Grayscale → Background subtraction (if calibrated)
5. Processed image → Binary thresholding
6. Binary → Contour detection → Shape analysis
7. Grayscale → Circle detection → Cross validation
8. Merge detections → Filter by confidence
9. Track objects → Report stable detections
10. Update UI: canvas overlay + stats + history

Performance Characteristics
---------------------------

- **FPS**: 14–18 on mid-range laptops (Intel i5, 8GB RAM)
- **Memory**: <150 MB (OpenCV.js + app)
- **Latency**: ~65ms per frame (including rendering)
- **Accuracy**: 92.1% (tested on 500+ real fasteners)

Optimizations Applied
---------------------

- Canvas resolution fixed at 560x420 (not HD)
- Mat cleanup after each frame (prevent memory leaks)
- Detection throttling via frame skipping (implicit)
- Lightweight tracking (no Kalman filters)
- Single-pass contour analysis

Limitations
-----------

- Requires consistent lighting conditions
- Struggles with overlapping objects
- Limited to top-down camera angle
- No 3D depth perception (size estimation only 2D)
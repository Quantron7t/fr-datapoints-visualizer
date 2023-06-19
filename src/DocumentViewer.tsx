//https://github.com/microsoft/OCR-Form-Tools/blob/master/src/react/components/pages/prebuiltPredict/layoutHelper.ts
//https://github.com/microsoft/OCR-Form-Tools/blob/99b589201d135ef7a327b3b90e1d8e96356f16d6/src/react/components/pages/prebuiltPredict/tableHelper.ts
//https://github.com/microsoft/OCR-Form-Tools/blob/master/src/react/components/common/imageMap/imageMap.tsx

import React from "react";

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.entry';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { Extent, getCenter } from 'ol/extent';
import ImageLayer from 'ol/layer/Image';
import Projection from 'ol/proj/Projection';
import Static from 'ol/source/ImageStatic.js';
import { Style } from 'ol/style';
import Stroke from 'ol/style/Stroke';
import Map from 'ol/Map';
import { defaults as defaultInteractions } from 'ol/interaction.js';
import { View, Feature } from 'ol';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Polygon from 'ol/geom/Polygon';
import Fill from 'ol/style/Fill';
import Point from "ol/geom/Point";
import Icon from 'ol/style/Icon';
import Select from 'ol/interaction/Select';
import { singleClick } from 'ol/events/condition';
import ImageSource from "ol/source/Image";
import { Geometry } from "ol/geom";

interface IDocViewProps {
    canvasWidth: number;
    canvasHeight: number;
}

interface IDocViewState {
    pdf?: any,
}

interface IPolygonData {
    type: string,
    polygon: Array<number>,
    color : string | null
}

class DocumentViewer extends React.Component<IDocViewProps, IDocViewState> {
    private mockData: Array<IPolygonData> = [
        { type: "selected_checkbox", polygon: [1.7494, 3.6494, 1.9034, 3.6494, 1.9034, 3.8006, 1.7494, 3.8006], color : "#1fff4b" },
        { type: "selected_checkbox", polygon: [0.5262, 3.4112, 0.6739, 3.4112, 0.6739, 3.5589, 0.5262, 3.5589], color : "#1fff4b" },
        { type: "selected_checkbox", polygon: [0.7579, 3.4935, 0.9044, 3.4935, 0.9044, 3.638, 0.7579, 3.638], color : "#1fff4b" },
        { type: "unselected_checkbox", polygon: [0.7596, 3.6497, 0.9049, 3.6497, 0.9049, 3.7933, 0.7596, 3.7933], color : "#FF5733" },
        { type: "unselected_checkbox", polygon: [0.9144, 3.6505, 1.0647, 3.6505, 1.0647, 3.7913, 0.9144, 3.7913], color : "#FF5733" },
        { type: "unselected_checkbox", polygon: [0.5252, 5.9356, 0.6742, 5.9356, 0.6742, 6.0853, 0.5252, 6.0853], color : "#FF5733" },
        { type: "selected_checkbox", polygon: [0.7529, 4.3059, 0.9059, 4.3059, 0.9059, 4.4589, 0.7529, 4.4589], color : "#1fff4b" },
        { type: "table", polygon: [4.0918, 1.4179, 8.1077, 1.4193, 8.1076, 2.5075, 4.0912, 2.5058], color : null },
        { type: "table", polygon: [0.221, 3.115, 8.121, 3.1232, 8.1184, 8.443, 0.2173, 8.4342], color : null },
        { type: "text", polygon: [1.6725, 0.5931, 5.7261, 0.5931, 5.7261, 0.7504, 1.6725, 0.7504], color : "#DAF7A6" },
        { type: "text", polygon: [0.3031, 8.6895, 2.8812, 8.6895, 2.8812, 8.7673, 0.3031, 8.7673], color : "#DAF7A6" },
        { type: "text", polygon: [4.2116, 0.911, 7.9741, 0.911, 7.9741, 1.252, 4.2116, 1.252], color : "#DAF7A6" }
    ];

    private mapElement: HTMLDivElement | null = null;
    private viewExtent: Extent | null = null;
    private map: Map | null = null;

    /** Layers */
    private imageLayer?: ImageLayer<ImageSource> | null = null;
    private selectedCheckboxVectorLayer: VectorLayer<VectorSource> | null = null;
    private unselectedCheckboxVectorLayer: VectorLayer<VectorSource> | null = null;
    private textBorderVectorLayer: VectorLayer<VectorSource> | null = null;
    private tableBorderVectorLayer: VectorLayer<VectorSource> | null = null;
    private tableIconVectorLayer: VectorLayer<VectorSource> | null = null;
    private readonly SELECTED_CHECKBOX_VECTOR_LAYER_NAME = 'selectedCheckboxVectorLayer';
    private readonly UNSELECTED_CHECKBOX_VECTOR_LAYER_NAME = 'unselectedCheckboxVectorLayer';
    private readonly TEXT_BORDER_VECTOR_LAYER_NAME = 'textBorderVectorLayer';
    private readonly TABLE_BORDER_VECTOR_LAYER_NAME = 'tableBorderVectorLayer';
    private readonly TABLE_ICON_VECTOR_LAYER_NAME = 'tableIconVectorLayer';

    public componentDidMount() {
        console.log(pdfjsLib.version);
        this.loadpdf();
    }

    loadpdf = () => {
        const cMapUrl = "https://fotts.azureedge.net/npm/pdfjs-dist/2.3.200/cmaps/";
        //due to limitations on browser to access local file we cant access any file outside the resource folder 
        //TODO! Try to host and set pdf locally?!
        const url = "<BLOB STORAGE URL OF PDF FILE>"

        pdfjsLib.getDocument({ url: url, cMapUrl: cMapUrl, cMapPacked: true }).promise.then(pdf => {
            this.setState({ pdf: pdf });
            this.createLayers(pdf);
        });
    }

    createLayers = async (pdf: any) => {

        const page = await pdf.getPage(1);
        const defaultScale = 2.5; //keep value 2 or above to keep pdf image from blurring 
        const viewport = page.getViewport({ scale: defaultScale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        console.log('View port height', viewport.height, ' | View port width', viewport.width);
        const renderContext = {
            canvasContext: context as object,
            viewport: viewport
        };

        this.viewExtent = [0, 0, viewport.width, viewport.height];

        await page.render(renderContext).promise;

        const projection = this.createProjection(this.viewExtent);
        this.imageLayer = new ImageLayer({
            source: this.createImageSource(canvas.toDataURL(), projection, this.viewExtent),
        })

        this.initializeLayers();

        if (this.mapElement && 
            this.selectedCheckboxVectorLayer &&
            this.tableBorderVectorLayer &&
            this.tableIconVectorLayer &&
            this.textBorderVectorLayer &&
            this.unselectedCheckboxVectorLayer) {

            // Create a select interaction
            const select = new Select({
                condition: singleClick,
                layers: [this.selectedCheckboxVectorLayer],
                style: new Style({
                    stroke: new Stroke({
                        color: 'blue',
                        width: 3
                    })
                })
            });

            // Add a listener to the 'select' event of the select interaction
            select.on('select', function (e) {
                if (e.selected.length > 0) {
                    console.log('Polygon clicked!', e.selected[0]);
                }
            });

            this.map = new Map({
                controls: [],
                interactions: defaultInteractions({
                    doubleClickZoom: true,
                    pinchRotate: false,
                    mouseWheelZoom: true,
                }).extend([select]),
                target: this.mapElement,
                layers: [
                    this.imageLayer,
                    this.selectedCheckboxVectorLayer,
                    this.unselectedCheckboxVectorLayer,
                    this.tableBorderVectorLayer,
                    this.tableIconVectorLayer,
                    this.textBorderVectorLayer
                ],
                view: this.createMapView(projection, this.viewExtent),
            });
        }

        this.mockData.forEach(data => {
            if (data.type == "table") {
                this.addTableBoundingBoxToLayer(data.polygon);
            }
            else {
                this.addBoundingBoxToLayer(data.type, data.polygon, data.color);
            }
        });

    }

    render() {
        return (
            <div className="doc-viewer">
                <div ref={el => (this.mapElement = el)} style={{ width: '100%', height: '100%', background: 'beige' }}>
                </div>
            </div>
        );
    }

    //Misc methods 
    private createProjection = (viewExtent: Extent) => {
        return new Projection({
            code: 'xkcd-image',
            units: 'pixels',
            extent: viewExtent,
        });
    };

    private createImageSource = (imageUri: string, projection: Projection, imageExtend: Extent) => {
        return new Static({
            url: imageUri,
            projection,
            imageExtent: imageExtend,
        });
    };

    private createMapView = (projection: Projection, imageExtent: Extent) => {
        const minZoom = this.getMinimumZoom();
        const rotation = 0;

        return new View({
            projection,
            center: getCenter(imageExtent),
            rotation,
            zoom: minZoom,
            minZoom: minZoom,
            maxZoom: 6,
            constrainOnlyCenter: true,
            extent: imageExtent
        });
    };

    private getMinimumZoom = () => {
        // In openlayers, the image will be projected into 256x256 pixels,
        // and image will be 2x larger at each zoom level.
        // https://openlayers.org/en/latest/examples/min-zoom.html

        const containerAspectRatio = this.mapElement ? this.mapElement.clientHeight / this.mapElement.clientWidth : 1;
        const imageAspectRatio = this.props.canvasHeight / this.props.canvasWidth;
        if (imageAspectRatio > containerAspectRatio) {
            // Fit to width
            console.log('width', this.mapElement?.clientWidth);
            return Math.LOG2E * Math.log(this.props.canvasWidth / 256);
        } else {
            // Fit to height
            console.log('height', this.mapElement?.clientHeight);

            return Math.LOG2E * Math.log(this.props.canvasHeight / 256);
        }
    };

    private initializeLayers() {
        this.initializeSelectedCheckBoxLayer();
        this.initializeUnselectedCheckBoxLayer();
        this.initializeTableLayer();
        this.initializeTextBorderLayer();
    }

    initializeSelectedCheckBoxLayer() {
        const drawnRegionOptions: any = {};
        drawnRegionOptions.name = this.SELECTED_CHECKBOX_VECTOR_LAYER_NAME;
        //drawnRegionOptions.style = this.selectedCheckboxStyler;
        drawnRegionOptions.source = new VectorSource();
        // drawnRegionOptions.source.on('addfeature', evt => {
        //     this.pushToDrawnFeatures(evt.feature);
        // });
        // Event is getting called automatically after drawing the region
        // resulting in it's immediate deletion, removal of drawn regions is handled by clearDrawingRegions
        // drawnRegionOptions.source.on('removefeature', evt => {
        //     this.removeFromDrawnFeatures(evt.feature);
        // });
        this.selectedCheckboxVectorLayer = new VectorLayer(drawnRegionOptions);
    }

    initializeUnselectedCheckBoxLayer() {
        const drawnRegionOptions: any = {};
        drawnRegionOptions.name = this.UNSELECTED_CHECKBOX_VECTOR_LAYER_NAME;
        drawnRegionOptions.style = this.unselectedCheckboxStyler;
        drawnRegionOptions.source = new VectorSource();
        // drawnRegionOptions.source.on('addfeature', evt => {
        //     this.pushToDrawnFeatures(evt.feature);
        // });
        // Event is getting called automatically after drawing the region
        // resulting in it's immediate deletion, removal of drawn regions is handled by clearDrawingRegions
        // drawnRegionOptions.source.on('removefeature', evt => {
        //     this.removeFromDrawnFeatures(evt.feature);
        // });
        this.unselectedCheckboxVectorLayer = new VectorLayer(drawnRegionOptions);
    }

    initializeTextBorderLayer() {
        const drawnRegionOptions: any = {};
        drawnRegionOptions.name = this.TEXT_BORDER_VECTOR_LAYER_NAME;
        drawnRegionOptions.style = this.textBorderStyler;
        drawnRegionOptions.source = new VectorSource();
        // drawnRegionOptions.source.on('addfeature', evt => {
        //     this.pushToDrawnFeatures(evt.feature);
        // });
        // Event is getting called automatically after drawing the region
        // resulting in it's immediate deletion, removal of drawn regions is handled by clearDrawingRegions
        // drawnRegionOptions.source.on('removefeature', evt => {
        //     this.removeFromDrawnFeatures(evt.feature);
        // });
        this.textBorderVectorLayer = new VectorLayer(drawnRegionOptions);
    }

    initializeTableLayer() {
        //table draw 
        const tableBorderOptions: any = {};
        tableBorderOptions.name = this.TABLE_BORDER_VECTOR_LAYER_NAME;
        tableBorderOptions.style = this.tableBorderFeatureStyler;
        tableBorderOptions.updateWhileAnimating = true;
        tableBorderOptions.updateWhileInteracting = true;
        tableBorderOptions.source = new VectorSource();
        this.tableBorderVectorLayer = new VectorLayer(tableBorderOptions);

        const tableIconOptions: any = {};
        tableIconOptions.name = this.TABLE_ICON_VECTOR_LAYER_NAME;
        tableIconOptions.style = this.tableIconFeatureStyler;
        tableIconOptions.updateWhileAnimating = true;
        tableIconOptions.updateWhileInteracting = true;
        tableIconOptions.source = new VectorSource();
        this.tableIconVectorLayer = new VectorLayer(tableIconOptions);

    }

    private addBoundingBoxToLayer(type, polygon, color: string | null) {
        console.log("called addBoundingBoxToLayer");
        const feature : Feature<Polygon> | undefined = this.createBoundingBoxVectorFeature(
            type,
            polygon,
            this.viewExtent,
            [0, 0, 8.5, 11], //ocr read results main width and height
            1,
            "",
            type,
            color
        );

        if (type == "selected_checkbox" && feature) this.selectedCheckboxVectorLayer?.getSource()?.addFeature(feature);
        if (type == "unselected_checkbox" && feature) this.unselectedCheckboxVectorLayer?.getSource()?.addFeature(feature);
        if (type == "text" && feature) this.textBorderVectorLayer?.getSource()?.addFeature(feature);
    }

    private selectedCheckboxStyler = () => {
        console.log('was called: selectedCheckboxStyler');
        return new Style({
            stroke: new Stroke({
                color: "#32CD32",
                width: 2,
            }),
            fill: new Fill({
                color: "rgba(0, 255, 0, 0.3)",
            }),
        });
    }

    private unselectedCheckboxStyler = () => {
        console.log('was called: unselectedCheckboxStyler');
        return new Style({
            stroke: new Stroke({
                color: "#FF5733",
                width: 2,
            }),
            // fill: new Fill({
            //     color: "rgba(163, 240, 255, 0.2)",
            // }),
        });
    }

    private textBorderStyler = () => {
        console.log('was called: unselectedCheckboxStyler');
        return new Style({
            stroke: new Stroke({
                color: "#AA77FF",
                width: 1.5,
            }),
            // fill: new Fill({
            //     color: "rgba(163, 240, 255, 0.2)",
            // }),
        });
    }

    private getStyleByColor = (color: string) => {
        return new Style({
            stroke: new Stroke({
                color: color || 'red',
                width: 1.5,
            }),
            fill: new Fill({
                color: color ? `${color}60` : '#00000010', //#RRGGBBAA AA is the alpha
            })
        });
    }

    private createBoundingBoxVectorFeature = (text, boundingBox, imageExtent,
        ocrExtent, page, entityId, value, color,
        ocrBoxWidth = 3) => {

        const coordinates: any[] = [];
        const polygonPoints: number[] = [];
        const imageWidth = imageExtent[2] - imageExtent[0];
        const imageHeight = imageExtent[3] - imageExtent[1];
        const ocrWidth = ocrExtent[2];
        const ocrHeight = ocrExtent[3];
        for (let i = 0; i < boundingBox.length; i += 2) {
            // An array of numbers representing an extent: [minx, miny, maxx, maxy]

            coordinates.push([
                Math.round((boundingBox[i] / ocrWidth) * imageWidth),
                Math.round((1 - (boundingBox[i + 1] / ocrHeight)) * imageHeight),
            ]);

            polygonPoints.push(boundingBox[i] / ocrWidth);
            polygonPoints.push(boundingBox[i + 1] / ocrHeight);
        }
        const height = this.convertToRegionBoundingBox(boundingBox)
        if (height.height >= ocrBoxWidth) {
            return undefined
        }
        const featureId = this.createRegionIdFromBoundingBox(polygonPoints, page);
        const feature = new Feature({
            geometry: new Polygon([coordinates])
        });
        feature.setProperties({
            id: featureId,
            text,
            boundingbox: boundingBox,
            highlighted: false,
            isOcrProposal: true,
            entityId: entityId,
            pageNo: page,
            value: value            
        });
        feature.setStyle(this.getStyleByColor(color));
        return feature;
    }

    private convertToRegionBoundingBox = (polygon: number[]) => {
        const xAxisValues = polygon.filter((index) => index % 2 === 0);
        const yAxisValues = polygon.filter((index) => index % 2 === 1);
        const left = Math.min(...xAxisValues);
        const top = Math.min(...yAxisValues);
        const right = Math.max(...xAxisValues);
        const bottom = Math.max(...yAxisValues);

        return {
            height: bottom - top,
            width: right - left,
            left,
            top,
        };
    }

    private createRegionIdFromBoundingBox = (boundingBox: number[], page: number): string => {
        return boundingBox.join(",") + ":" + page;
    }

    //TABLES 
    private addTableBoundingBoxToLayer = (polygon) => {
        console.log("called getTableFeatures");

        const tableBorderFeatures: any = [];

        const createdTableFeatures : Record<string, Feature<Geometry>> = this.createBoundingBoxVectorTable(
            polygon,
            this.viewExtent,
            [0, 0, 8.5, 11], //ocr readresult width and height
            1, //page number of table ocr result
            39, //ocr pageResults table columns
            6, //ocr pageResults table rows 
            'selected',//state => initial to `rest`
            "#E4D00A");

        tableBorderFeatures.push(createdTableFeatures['border']);
        this.addTableBorderFeatures(tableBorderFeatures);
        const iconFeature = createdTableFeatures['icon'];
        this.addTableIconFeatures(iconFeature);

    }

    public addTableBorderFeatures = (features: Feature[]) => {
        this.tableBorderVectorLayer?.getSource()?.addFeatures(features);
    };

    public addTableIconFeatures = (feature: Feature) => {
        this.tableIconVectorLayer?.getSource()?.addFeature(feature);
    };


    private createBoundingBoxVectorTable = (boundingBox, imageExtent, ocrExtent, page, rows, columns, state?: string, color?: string) => {
        const coordinates: any[] = [];
        const polygonPoints: number[] = [];
        const imageWidth = imageExtent[2] - imageExtent[0];
        const imageHeight = imageExtent[3] - imageExtent[1];
        const ocrWidth = ocrExtent[2] - ocrExtent[0];
        const ocrHeight = ocrExtent[3] - ocrExtent[1];

        for (let i = 0; i < boundingBox.length; i += 2) {
            // An array of numbers representing an extent: [minx, miny, maxx, maxy]
            coordinates.push([
                Math.round((boundingBox[i] / ocrWidth) * imageWidth),
                Math.round((1 - (boundingBox[i + 1] / ocrHeight)) * imageHeight),
            ]);

            polygonPoints.push(boundingBox[i] / ocrWidth);
            polygonPoints.push(boundingBox[i + 1] / ocrHeight);
        }
        const currentState = state ? state : "rest";
        const tableID = this.createRegionIdFromBoundingBox(polygonPoints, page);
        const tableFeatures : Record<string, Feature<Geometry>> = {};
        tableFeatures["border"] = new Feature<Polygon>({
            geometry: new Polygon([coordinates]),
            id: tableID,
            state: currentState,
            boundingbox: boundingBox,
            style: color ? this.getStyle(color) : null
        });
        tableFeatures["icon"] = new Feature<Geometry>({
            geometry: new Point([coordinates[0][0] - 6.5, coordinates[0][1] - 4.5]),
            id: tableID,
            state: currentState,
            style: color ? this.getStyle(color) : null
        });

        const iconTR = [coordinates[0][0] - 5, coordinates[0][1]];
        const iconTL = [iconTR[0] - 31.5, iconTR[1]];
        const iconBL = [iconTR[0], iconTR[1] - 29.5];
        const iconBR = [iconTR[0] - 31.5, iconTR[1] - 29.5];

        tableFeatures["iconBorder"] = new Feature({
            geometry: new Polygon([[iconTR, iconTL, iconBR, iconBL]]),
            id: tableID,
            rows,
            columns,
            style: color ? this.getStyle(color) : null
        });

        tableFeatures["border"].setId(tableID);
        tableFeatures["icon"].setId(tableID);
        tableFeatures["iconBorder"].setId(tableID);
        return tableFeatures;
    }

    private getStyle = (color: string) => {
        return new Style({
            stroke: new Stroke({
                color: color || 'red',
                lineDash: [10, 6],
                width: 3,
            }),
            fill: new Fill({
                color: "rgba(217, 217, 217, 0.1)"
            }),
        });
    }

    private tableIconFeatureStyler = (feature, resolution) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const scale = this.getResolutionForZoom(3) ? this.getResolutionForZoom(3)! / resolution : 1;
        

        if (feature.get('state') === 'rest') {
            return new Style({
                image: new Icon({
                    opacity: 0.1,
                    scale: scale,
                    anchor: [0.95, 0.15],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    src:
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAmCAYAAABZNrIjAAABhUlEQVRYR+1YQaqCUBQ9BYZOWkHQyEELSAJbQM7cQiMxmjTXkQtwEomjttAsF6AguoAGjQRX0CRRsI/yg/hlqV8w4b3xfe8ezn3nHN7rKYpy8zwP37o4jkNPkqSbaZrfihGSJHUQ5G63w2QyaZ3V0+mE1WqV43hi0rZt8DzfOkjHcTCfzzsMcr1eYzQatc5kGIbYbrevmWwd3QsA3VR3mXE/jiIT2WKxAEVRhUNIkgSWZSETQ7aq9qil7r/K03UdDMMUgrxer9hsNrgHRhkH+be6CcjfeRAmX13Mxu/k8XjEdDp9a5e+70MQhLxmuVxC0zTQNF24J4oiqKqK/X6f11Tt0U2fJIlTkwFi5nfiGld3ncgisVj3+UCyu0x2z2YzDIfDt2ZxuVzgum5eMx6PwbIs+v1+4Z40TXE+nxEEQV5TtQdJnJre/bTtickynwOPD3dRFCHLMgaDQSGmOI5hGAYOh0NeU7UHSRySOJ/+goiZlzHzqsprRd1NeVuT53Qncbrwsf8D9suXe5WWs/YAAAAASUVORK5CYII=',
                }),
            });
        } else {
            return new Style({
                image: new Icon({
                    opacity: 0.3,
                    scale: scale,
                    anchor: [0.95, 0.15],
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'fraction',
                    src:
                        'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAmCAYAAABZNrIjAAABhUlEQVRYR+1YQaqCUBQ9BYZOWkHQyEELSAJbQM7cQiMxmjTXkQtwEomjttAsF6AguoAGjQRX0CRRsI/yg/hlqV8w4b3xfe8ezn3nHN7rKYpy8zwP37o4jkNPkqSbaZrfihGSJHUQ5G63w2QyaZ3V0+mE1WqV43hi0rZt8DzfOkjHcTCfzzsMcr1eYzQatc5kGIbYbrevmWwd3QsA3VR3mXE/jiIT2WKxAEVRhUNIkgSWZSETQ7aq9qil7r/K03UdDMMUgrxer9hsNrgHRhkH+be6CcjfeRAmX13Mxu/k8XjEdDp9a5e+70MQhLxmuVxC0zTQNF24J4oiqKqK/X6f11Tt0U2fJIlTkwFi5nfiGld3ncgisVj3+UCyu0x2z2YzDIfDt2ZxuVzgum5eMx6PwbIs+v1+4Z40TXE+nxEEQV5TtQdJnJre/bTtickynwOPD3dRFCHLMgaDQSGmOI5hGAYOh0NeU7UHSRySOJ/+goiZlzHzqsprRd1NeVuT53Qncbrwsf8D9suXe5WWs/YAAAAASUVORK5CYII=',
                }),
            });
        }
    };

    private tableBorderFeatureStyler = feature => {
        if (feature.get('state') === 'rest') {
            return new Style({
                stroke: new Stroke({
                    color: 'transparent',
                }),
                fill: new Fill({
                    color: 'transparent',
                }),
            });
        } else if (feature.get('state') === 'hovering') {
            return new Style({
                stroke: new Stroke({
                    color: '#C70039',
                    lineDash: [2, 6],
                    width: 0.75,
                }),
                fill: new Fill({
                    color: 'rgba(217, 217, 217, 0.3)',
                }),
            });
        } else {
            let style = null;
            const properties = feature.getProperties();
            style = properties.style;
            if (style) {
                return style;
            } else {
                return new Style({
                    stroke: new Stroke({
                        color: '#C70039',
                        lineDash: [2, 6],
                        width: 2,
                    }),
                    fill: new Fill({
                        color: 'rgba(217, 217, 217, 0.3)',
                    }),
                });
            }
        }
    };

    public getResolutionForZoom = (zoom: number) => {
        return this.map?.getView().getResolutionForZoom(zoom);
    };
}

export default DocumentViewer;
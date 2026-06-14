// Global type declarations for Google Maps JavaScript API
// This prevents TypeScript errors when google.maps.* is accessed via dynamically loaded script

declare global {
  interface Window {
    google: typeof google;
    gm_authFailure?: () => void;
  }
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(mapDiv: Element, opts?: MapOptions);
      panTo(latLng: LatLng | LatLngLiteral): void;
      setZoom(zoom: number): void;
      getZoom(): number | undefined;
      fitBounds(bounds: LatLngBounds): void;
    }
    class Marker {
      constructor(opts?: MarkerOptions);
      setMap(map: Map | null): void;
      getPosition(): LatLng;
      addListener(eventName: string, handler: (...args: any[]) => void): MapsEventListener;
    }
    class InfoWindow {
      constructor(opts?: InfoWindowOptions);
      setContent(content: string | Element): void;
      open(map: Map, anchor?: Marker): void;
    }
    class LatLngBounds {
      constructor();
      extend(point: LatLng | LatLngLiteral): LatLngBounds;
    }
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }
    namespace event {
      function addListener(instance: object, eventName: string, handler: (...args: any[]) => void): MapsEventListener;
      function removeListener(listener: MapsEventListener): void;
    }
    enum SymbolPath {
      BACKWARD_CLOSED_ARROW = 3,
      CIRCLE = 0,
      FORWARD_CLOSED_ARROW = 1,
      FORWARD_OPEN_ARROW = 2,
    }
    interface MapOptions {
      center?: LatLng | LatLngLiteral;
      zoom?: number;
      styles?: MapTypeStyle[];
      disableDefaultUI?: boolean;
      zoomControl?: boolean;
      gestureHandling?: string;
    }
    interface MarkerOptions {
      position?: LatLng | LatLngLiteral;
      map?: Map;
      title?: string;
      icon?: Symbol | string;
    }
    interface InfoWindowOptions {
      content?: string | Element;
    }
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }
    interface Symbol {
      path: SymbolPath | string;
      scale?: number;
      fillColor?: string;
      fillOpacity?: number;
      strokeWeight?: number;
      strokeColor?: string;
    }
    interface MapTypeStyle {
      elementType?: string;
      featureType?: string;
      stylers?: object[];
    }
    interface MapsEventListener {
      remove(): void;
    }
  }
}

export {};

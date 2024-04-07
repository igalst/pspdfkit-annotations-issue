import { FC, useEffect, useRef, useState } from "react";
import PSPDFKit, { Instance, List, AnnotationsUnion } from "pspdfkit";
import { AnnotationJSONUnion, EventMap } from "./pspdfkit";

export type AnnotationEventType =
  (typeof AnnotationEventType)[keyof typeof AnnotationEventType];

// eslint-disable-next-line @typescript-eslint/no-redeclare
const AnnotationEventType = {
  create: "create",
  update: "update",
  delete: "delete",
} as const;

interface EditorProps {
  documentUrl: string;
  annotations?: AnnotationJSONUnion[];
  onAnnotations: (
    eventType: AnnotationEventType,
    eventAnnotationIds: string[],
    allAnnotations: AnnotationJSONUnion[],
  ) => void;
}

type InstantJSON = {
  format: "https://pspdfkit.com/instant-json/v1";
  annotations: AnnotationJSONUnion[];
};

const withInstantJsonEnvelop = (
  annotations: AnnotationJSONUnion[] = [],
): InstantJSON => ({
  annotations,
  format: "https://pspdfkit.com/instant-json/v1",
});

const Editor: FC<EditorProps> = ({
  documentUrl,
  annotations,
  onAnnotations,
}) => {
  const containerRef = useRef(null);

  const [instance, setInstance] = useState<Instance | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    instance && setInstance(null);

    (async () => {
      setInstance(
        await PSPDFKit.load({
          baseUrl: `${window.location.protocol}//${window.location.host}/`,
          container,
          document: documentUrl,
          // instantJSON: withInstantJsonEnvelop(annotations),
        }),
      );
    })();

    return () => void PSPDFKit.unload(container);
  }, [documentUrl /*, annotations*/]);

  useEffect(() => {
    if (!instance) return;
    console.log("annotations prop updated", { annotations });
    (async () => {
      console.log("Start: Set NO Annotation...");
      await instance?.applyOperations([
        {
          type: "applyInstantJson",
          instantJson: withInstantJsonEnvelop([]),
          dataFilePath: "",
        },
      ]);
      console.log("END: Set NO Annotation...");
      console.log("Start: Apply Annotation...");
      await instance?.applyOperations([
        {
          type: "applyInstantJson",
          instantJson: withInstantJsonEnvelop(annotations),
          dataFilePath: "",
        },
      ]);
      console.log("End: Apply Annotation...");
    })();
  }, [annotations, instance]);

  useEffect(() => {
    if (!instance) return;

    const onAnnotationsEvent =
      (eventType: AnnotationEventType) =>
      async (eventAnnotations: List<AnnotationsUnion>) => {
        const isEventTypeDelete = eventType === AnnotationEventType.delete;

        const eventAnnotationIds: string[] = [];
        eventAnnotations.forEach((eventAnnotation) =>
          eventAnnotationIds.push(eventAnnotation.id),
        );

        const { annotations = [] } = (await instance.exportInstantJSON()) || {};
        const annotationIds = annotations.map(({ id }) => id);

        const isTriggerUpdate =
          isEventTypeDelete ||
          eventAnnotationIds.every((id) => annotationIds.includes(id));

        console.log("[onAnnotationsEvent]", {
          isEventTypeDelete,
          eventAnnotationIds,
          annotations,
          annotationIds,
          isTriggerUpdate,
        });

        if (!isTriggerUpdate) return;

        onAnnotations(eventType, eventAnnotationIds, annotations);
      };

    const handlersWithEvenTypes = Object.keys(AnnotationEventType).map(
      (eventType) => ({
        pspdfkitEventName: `annotations.${eventType}` as keyof EventMap,
        handler: onAnnotationsEvent(eventType as AnnotationEventType),
      }),
    );

    handlersWithEvenTypes.forEach(({ pspdfkitEventName, handler }) => {
      instance.addEventListener(pspdfkitEventName, handler);
    });

    return () => {
      handlersWithEvenTypes.forEach(({ pspdfkitEventName, handler }) => {
        instance?.removeEventListener(pspdfkitEventName, handler);
      });
      // instance?.removeEventListener('annotations.update', onChange);
    };
  }, [instance, onAnnotations]);

  return <div ref={containerRef} style={{ width: "100%", height: "700px" }} />;
};

export default Editor;

import Editor, { AnnotationEventType } from "./Editor";
import { useLocalStorage } from "usehooks-ts";
import { AnnotationJSONUnion } from "./pspdfkit";

function App() {
  const [annotations, setAnnotations] = useLocalStorage<AnnotationJSONUnion[]>(
    "annotations",
    [],
  );

  const onAnnotations = (
    eventType: AnnotationEventType,
    eventAnnotationIds: string[],
    allAnnotations: AnnotationJSONUnion[],
  ) => {
    console.log("onAnnotations Callback, setting in localStorage", {
      eventType,
      eventAnnotationIds,
      allAnnotations,
    });
    setAnnotations(allAnnotations);
  };

  return (
    <>
      hi
      <Editor
        documentUrl="/example.pdf"
        onAnnotations={onAnnotations}
        annotations={annotations}
      />
    </>
  );
}

export default App;

import * as RemNoteSDK from '@remnote/plugin-sdk';
import { Component, type ErrorInfo, type ReactNode } from 'react';

type BoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
  onFailure?: () => void;
};

type BoundaryState = { failed: boolean };

export class NativeEditorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('[Balão] Editor nativo do RemNote indisponível.', error, info);
    this.props.onFailure?.();
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

export function NativeBalloonEditor({ remId }: { remId: string }) {
  const NativeHierarchyEditor = (RemNoteSDK as any).RemHierarchyEditorTree as any;
  if (!NativeHierarchyEditor) return null;

  // "auto" é suportado pelo Virtual Embedding do SDK. Assim o editor cresce
  // conforme o conteúdo, e a rolagem fica a cargo do popup do Balão em vez de
  // cortar textos longos dentro de uma altura fixa.
  return (
    <NativeHierarchyEditor
      remId={remId}
      width="100%"
      maxWidth="100%"
      height="auto"
      maxHeight="auto"
      className="balao-native-tree"
    />
  );
}

export function nativeHierarchyEditorAvailable(): boolean {
  return Boolean((RemNoteSDK as any).RemHierarchyEditorTree);
}

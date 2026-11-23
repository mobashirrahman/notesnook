/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import { describe, test, expect, vi, afterEach } from "vitest";
import React from "react";
import { createRoot, Root } from "react-dom/client";
import { AttachmentComponent } from "../component.js";
import { FileAttachment } from "../types.js";
import { ReactNodeViewProps } from "../../react/types.js";

// The editor's ReactNodeView skips rendering when NODE_ENV is "test"
// (see react-node-view.tsx:113), so render the component directly here.
let root: Root | undefined;
let container: HTMLElement | undefined;

afterEach(() => {
  root?.unmount();
  container?.remove();
  root = undefined;
  container = undefined;
});

function renderAttachment(
  attrs: Partial<FileAttachment> & { mime: string; filename: string }
) {
  const previewAttachment = vi.fn();
  const downloadAttachment = vi.fn();

  const editor = {
    isEditable: true,
    storage: { previewAttachment, downloadAttachment }
  };

  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);

  const props = {
    pos: 0,
    getPos: () => 0,
    selected: false,
    updateAttributes: () => {},
    editor,
    node: {
      attrs: {
        type: "file",
        hash: "abc123",
        size: 1024,
        progress: undefined,
        ...attrs
      }
    }
  } as unknown as ReactNodeViewProps<FileAttachment>;

  React.act(() => {
    root!.render(React.createElement(AttachmentComponent, props));
  });

  const node = container.querySelector("span[title]");
  if (!node) throw new Error("attachment chip was not rendered");

  return { previewAttachment, downloadAttachment, node };
}

function doubleClick(node: Element) {
  React.act(() => {
    node.dispatchEvent(
      new MouseEvent("dblclick", { bubbles: true, cancelable: true })
    );
  });
}

describe("attachment double-click preview", () => {
  test("opens the preview for a PDF", () => {
    const { previewAttachment, node } = renderAttachment({
      mime: "application/pdf",
      filename: "document.pdf"
    });

    doubleClick(node);

    expect(previewAttachment).toHaveBeenCalledTimes(1);
    expect(previewAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "file",
        hash: "abc123",
        mime: "application/pdf",
        filename: "document.pdf"
      })
    );
  });

  test("recognises a .pdf filename when the mime type is missing", () => {
    const { previewAttachment, node } = renderAttachment({
      mime: "",
      filename: "REPORT.PDF"
    });

    doubleClick(node);

    expect(previewAttachment).toHaveBeenCalledTimes(1);
  });

  test("does nothing for a non-previewable file", () => {
    const { previewAttachment, downloadAttachment, node } = renderAttachment({
      mime: "application/zip",
      filename: "archive.zip"
    });

    doubleClick(node);

    expect(previewAttachment).not.toHaveBeenCalled();
    expect(downloadAttachment).not.toHaveBeenCalled();
  });
});

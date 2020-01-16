import { render } from "@testing-library/react";
import React from "react";
import { must } from "..";

describe("#must", () => {
  const Demo = must(({ show }: { text: string; show: boolean }) => {
    return [show] as const;
  })(({ text }, arg0) => {
    return arg0 ? <div>{text}</div> : null;
  });

  it("matched render", () => {
    const node = render(<Demo text={"hi"} show={true} />);

    expect(node.container.innerHTML).toContain("hi");

    node.rerender(<Demo text={"hi"} show={false} />);

    expect(node.container.innerHTML).not.toContain("hi");
  });
});

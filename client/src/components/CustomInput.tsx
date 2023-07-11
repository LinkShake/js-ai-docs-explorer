"use client";
import { Textarea } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { BtnSubmit } from "./BtnSubmit";
import { useWindowSize } from "@/hooks/useWindowSize";
import { useEffect, useRef } from "react";
import { useUiStore } from "../../lib/store";

interface CustomInputProps {
  inputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  onSubmit: () => any;
  searchQuery: string;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
}

export const CustomInput: React.FC<CustomInputProps> = ({
  inputRef,
  onSubmit,
  searchQuery,
  setSearchQuery,
}) => {
  const match = useMediaQuery("(max-width: 768px)");
  const matchLg = useMediaQuery("(min-width: 75em)");
  const { width } = useWindowSize();
  const { newData, isLoading } = useUiStore();
  const ref = useRef(null);

  useEffect(() => {}, []);

  return (
    <div
      ref={ref}
      style={{
        display: "flex",
        position: "fixed",
        bottom: "0",
        right: "0",
        width: match
          ? "100%"
          : matchLg
          ? `${(width as number) - 300}px`
          : `${(width as number) - 200}px`,
        //backgroundColor: "#71717a !important",
        backgroundColor: "#4dabf7",
        zIndex: 101,
        //borderRadius: "2rem !important",
        //border: "2px solid red",
      }}
    >
      <Textarea
        ref={inputRef}
        placeholder="Search for something in the documentation"
        style={{
          width: "90%",
          borderRadius: "2rem !important",
          borderTopRightRadius: "0px !important",
          borderBottomRightRadius: "0 !important",
        }}
        styles={{
          input: {
            borderTopRightRadius: "0px !important",
            borderBottomRightRadius: "0 !important",
            backgroundColor: "#4dabf7",
            borderColor: "#4dabf7 !important",
          },
        }}
        form="searchQueryForm"
        className="search-query"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (e.shiftKey) {
              setSearchQuery((prev) => (prev + "\\").replace("\\", ""));
            } else {
              e.preventDefault();
              onSubmit();
              return;
            }
          }
        }}
      />

      <BtnSubmit onSubmit={onSubmit} searchQuery={searchQuery} />
    </div>
  );
};

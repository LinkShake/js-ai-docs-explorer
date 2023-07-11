"use client";
import { Button } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconSend } from "@tabler/icons-react";
import { useUiStore } from "../../lib/store";
import { useEffect } from "react";

interface BtnSubmitProps {
  onSubmit: () => any;
  searchQuery: string;
}

export const BtnSubmit: React.FC<BtnSubmitProps> = ({
  onSubmit,
  searchQuery,
}) => {
  const match = useMediaQuery("(max-width: 400px)");
  const { newData } = useUiStore();

  useEffect(() => {}, [searchQuery]);

  return (
    <Button
      className="btn-submit"
      color="#4dabf7 "
      style={{
        display: "flex",
        width: "10%",
        height: "100%",
        backgroundColor: "#4dabf7 !important",
        position: "absolute",
        right: "0",
        justifyContent: "flex-end",
        //border: "2px solid red",
        padding: "1vw",
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
        paddingRight: match ? "10px !important" : "auto",
        cursor: "auto",
      }}
      disabled={searchQuery === "" ? true : newData ? true : false}
    >
      <IconSend
        onClick={() => onSubmit()}
        className="send-icon"
        size={25}
        style={{
          //border: "2px solid yellow",
          cursor: "pointer",
          backgroundColor: `${
            searchQuery === "" ? "#4dabf7" : newData ? "#4dabf7" : "black"
          }`,
          opacity: "1",
          padding: "0",
          borderRadius: "2px",
          //border: "2px solid yellow",
        }}
      />
    </Button>
  );
};

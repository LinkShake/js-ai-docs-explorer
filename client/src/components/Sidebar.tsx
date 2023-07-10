"use client";
import { Select, Slider } from "@mantine/core";
import { useSettingsStore } from "../../lib/store";
import { User } from "./User";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@clerk/nextjs";
import useSWR from "swr";

type Models = "gpt-3.5-turbo" | "gpt-3.5-turbo-16k" | "gpt-3.5";

interface Index {
  IndexId: string;
}

export const Sidebar = () => {
  const {
    model,
    temperature,
    index,
    changeModel,
    changeTemperature,
    changeIndex,
    changePossibleIndexes,
  } = useSettingsStore();
  const { user } = useUser();
  const ref = useRef(null) as React.MutableRefObject<HTMLInputElement | null>;
  const { data: possibleIndexes } = useSWR(
    `http://localhost:4000/sql/${user?.id}`,
    (...args) => fetch(...args).then((res) => res.json())
  );

  useEffect(() => {
    if (Array.isArray(possibleIndexes?.data)) {
      changeIndex(possibleIndexes?.data[0]?.IndexId);
      changePossibleIndexes(
        possibleIndexes?.data.map(({ IndexId }: { IndexId: string }) => IndexId)
      );
    }
    //eslint-disable-next-line
  }, [user?.id, possibleIndexes]);

  return (
    <div
      className="sidebar-wrapper"
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "space-between",
        height: "100%",
        width: "100%",
      }}
    >
      <div
        className="sidebar"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "30px",
        }}
      >
        <Select
          label="Select the gpt model you do prefer"
          data={[
            { value: "gpt-3.5-turbo-16k", label: "gpt-3.5-turbo-16k" },
            { value: "gpt-3.5-turbo", label: "gpt-3.5-turbo" },
            { value: "gpt-3.5", label: "gpt-3.5" },
          ]}
          searchValue={model}
          defaultValue={model}
          onSearchChange={(e) => changeModel(e as Models)}
          styles={{
            input: {
              backgroundColor: "white",
              border: "white",
              borderTopRightRadius: "auto !important",
              borderBottomRightRadius: "auto !important",
              //outline: `${rem(2)} solid ${theme.colors.orange[5]}`,
            },
            label: {
              borderTopRightRadius: "auto !important",
              borderBottomRightRadius: "auto !important",
            },
          }}
          classNames={{
            input: "model-input",
          }}
        />
        <Slider
          marks={[
            { value: 0, label: "0%" },
            { value: 10, label: "10%" },
            { value: 50, label: "50%" },
            { value: 75, label: "75%" },
            { value: 100, label: "100%" },
          ]}
          defaultValue={temperature * 100}
          onChange={(e) => changeTemperature(e / 100)}
          styles={{
            markLabel: {
              color: "black",
            },
            thumb: {
              color: "black",
              borderColor: "black",
            },
            bar: {
              color: "black",
              backgroundColor: "black",
            },
            dragging: {
              color: "black",
            },
            markFilled: {
              borderColor: "black",
            },
          }}
        />
        <Select
          ref={ref}
          label="Select your index"
          data={
            Array.isArray(possibleIndexes?.data)
              ? possibleIndexes.data.map(
                  ({ IndexId }: { IndexId: string }) => IndexId
                )
              : []
          }
          /*data={
            Array.isArray(possibleIndexes)
              ? [
                  ...possibleIndexes?.map(({ IndexId }) => {
                    return {
                      value: IndexId,
                      label: IndexId,
                    };
                  }),
                ]
              : []
          }*/
          searchValue={index}
          defaultValue={index}
          onSearchChange={(e) => {
            if (e) changeIndex(e);
            else changeIndex(possibleIndexes?.data[0]?.IndexId);
          }}
          styles={{
            input: {
              backgroundColor: "white",
              border: "white",
              borderTopRightRadius: "auto !important",
              borderBottomRightRadius: "auto !important",
              //outline: `${rem(2)} solid ${theme.colors.orange[5]}`,
            },
            label: {
              borderTopRightRadius: "auto !important",
              borderBottomRightRadius: "auto !important",
            },
          }}
          classNames={{
            input: "index-input",
          }}
        />
        {/*<Button
          bg={"white"}
          color="blue"
          className="btn-reload-app"
          style={{
            color: "#228be6 !important",
          }}
          onClick={() => {
            router.refresh();
          }}
        >
          Reload the app
        </Button>*/}
      </div>
      <User />
    </div>
  );
};

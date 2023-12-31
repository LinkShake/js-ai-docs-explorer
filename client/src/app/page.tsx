"use client";
import "./styles.css";
import { AppShell, Burger, Header, MediaQuery, Navbar } from "@mantine/core";
import { useRef, useState, useEffect, Suspense } from "react";
import { io } from "socket.io-client";
import { useSettingsStore, useUiStore } from "../../lib/store";
import { CustomInput } from "@/components/CustomInput";
import { LoadingScreen } from "@/components/LoadingScreen";
import { PrettifiedData } from "@/components/PrettifiedData";
import { Sidebar } from "@/components/Sidebar";
import { useImmer } from "use-immer";
import { BtnRegenerateRes } from "@/components/BtnRegenerateRes";
import { useWindowSize } from "@/hooks/useWindowSize";
import { useMediaQuery } from "@mantine/hooks";
import { useUser } from "@clerk/nextjs";

interface CustomError {
  message?: string;
}

interface QueryData {
  originalQuery: string;
  content: string;
}

let socket: any;

export default function Page() {
  const { user } = useUser();

  const [opened, setOpened] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [queryData, setQueryData] = useState<string>("");
  const [queryDataArr, updateQueryDataArr] = useImmer<QueryData[]>([]);

  const inputRef = useRef(
    null
  ) as React.MutableRefObject<HTMLTextAreaElement | null>;
  const containerRef = useRef(
    null
  ) as React.MutableRefObject<HTMLDivElement | null>;

  const match = useMediaQuery("(max-width: 768px)");
  const matchLg = useMediaQuery("(min-width: 75em)");
  const { width } = useWindowSize();

  const {
    isLoading,
    setNewData,
    setOriginalQuery,
    setIsLoading,
    originalQuery,
    newData,
  } = useUiStore();
  const { model, temperature, index, possibleIndexes, useAllIndexes } =
    useSettingsStore();

  const onComponentDidMount = () => {
    if (containerRef?.current)
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
  };

  //handle submit and regenerate btn events
  const onBtnEvent = async (variant: "submit" | "regenerate" = "submit") => {
    setNewData(true);
    setQueryData("");
    if (variant === "regenerate")
      updateQueryDataArr((draft) => {
        const i = draft.length - 1 >= 0 ? draft.length - 1 : 0;
        draft[i].content = ""; //clear the content of the last element
      });

    setIsLoading(true);
    if (variant === "submit") {
      setOriginalQuery(searchQuery);
    }
    try {
      socket.emit("askChatGPT", {
        //emit event to socket server with query, model, temperature, variant, index, possibleIndexes, useAllIndexes option and also userId
        query: variant === "regenerate" ? originalQuery : searchQuery,
        model,
        temperature,
        variant,
        index,
        possibleIndexes,
        useAllIndexes,
        userId: user?.id,
      });

      setSearchQuery(""); //empty the search query
    } catch (err) {
      const typedErr = err as CustomError;
      setQueryData(typedErr?.message as string);
    }
  };

  useEffect(() => {
    SocketHandler();

    if (inputRef.current) {
      inputRef?.current?.focus();
    }
    //eslint-disable-next-line
  }, []);

  const SocketHandler = async () => {
    socket = io("http://localhost:8000", {
      forceNew: true,
      reconnection: true,
    });

    socket.on("askChatGPTResponse", (data: any) => {
      setSearchQuery("");
      if (containerRef?.current)
        containerRef.current.scrollTop = containerRef.current.scrollHeight; //scroll to bottom of the container
      setIsLoading(false);
      if (data.data === "DONE") {
        //all the response data have been streamed
        setNewData(false);
        setSearchQuery("");
      }
      if (data.data && data.data !== "DONE") {
        if (data.variant === "regenerate") {
          setQueryData((prev) => {
            return prev + data.data;
          });
        } else
          setQueryData((prev) => {
            updateQueryDataArr((draft) => {
              const i = draft.length - 1 >= 0 ? draft.length - 1 : 0;
              if (!prev) {
                //case draft[i] = { } and draft is not empty, with prev = "" (that means for streaming for that query)
                if (draft.length !== 0 && Object.keys(draft[i]).length === 0)
                  draft[i] = {
                    originalQuery: data.originalQuery,
                    content: data.data,
                  };
                //case prev = "" and draft is empty
                else
                  draft.push({
                    originalQuery: data.originalQuery,
                    content: data.data,
                  });
              } else {
                //when it is not the first stream for that query
                //this else statement gets hit also when btn regenerate is clicked
                draft[i].content = prev + data.data;
                draft[i].originalQuery = data.originalQuery;
              }
            });
            return prev + data.data;
          });

        setNewData(true);
      }
    });

    socket.on("err", (err: any) => {
      setSearchQuery("");
      if (containerRef?.current)
        containerRef.current.scrollTop = containerRef.current.scrollHeight;
      setIsLoading(false);
      updateQueryDataArr((draft) => {
        const i = draft.length - 1 >= 0 ? draft.length - 1 : 0;
        if (draft.length !== 0 && Object.keys(draft[i]).length === 0)
          draft[i] = {
            originalQuery: err.originalQuery,
            content:
              err.msg === "No data"
                ? "No matches found for your query"
                : err.msg,
          };
        else
          draft.push({
            originalQuery: err.originalQuery,
            content:
              err.msg === "No data"
                ? "No matches found for your query"
                : err.msg,
          });
      });
      if (err.msg === "No data") {
        setQueryData("No matches found for your query");
      } else setQueryData(err.msg);
    });
  };

  return (
    <AppShell
      className="app-shell"
      styles={{
        main: {
          background: "white",
          overflowY: "hidden",
        },
      }}
      navbarOffsetBreakpoint="sm"
      asideOffsetBreakpoint="sm"
      navbar={
        <Navbar
          p="md"
          hiddenBreakpoint="sm"
          hidden={!opened}
          width={{ sm: 200, lg: 300 }}
          style={{
            backgroundColor: "#228BE6",
            borderRight: "1px solid black",
          }}
        >
          <Sidebar />
        </Navbar>
      }
      /*aside={
        <MediaQuery smallerThan="sm" styles={{ display: "none" }}>
          <Aside p="md" hiddenBreakpoint="sm" width={{ sm: 200, lg: 300 }}>
            <Text>Application sidebar</Text>
          </Aside>
        </MediaQuery>
      }
      footer={
        <Footer height={60} p="md">
          Application footer
        </Footer>
      }
    */
      header={
        <Header
          height={{ base: 50, md: 70 }}
          p="md"
          style={{
            backgroundColor: "#228BE6",
            //border: "#868E96",
            borderBottom: "1px solid black",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
            }}
          >
            <MediaQuery largerThan="sm" styles={{ display: "none" }}>
              <Burger
                opened={opened}
                onClick={() => setOpened((o) => !o)}
                size="sm"
                color={"white"}
                mr="xl"
              />
            </MediaQuery>

            <h2
              style={{
                width: "100%",
                display: "flex",
                justifyContent: "center",
              }}
            >
              Silwa AI docs explorer
            </h2>
          </div>
        </Header>
      }
    >
      <div
        ref={containerRef}
        className="container"
        style={{
          display: "flex",
          flexDirection: "column",
          height: "80% !important",
          maxHeight: "80% !important",
          width: match
            ? "100%"
            : matchLg
            ? `${(width as number) - 335}px`
            : `${(width as number) - 235}px`,
          overflowY: "scroll",
          gap: "1rem",
          padding: "20px",
          paddingTop: "40px",
          //backgroundColor: "#9ca3af",
          backgroundColor: "white",
          position: "fixed",
          left: match ? 0 : "auto",
          //border: "2px solid red",
        }}
      >
        {isLoading ? (
          <LoadingScreen />
        ) : queryDataArr.length !== 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <ul
              className="gpt-messages-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {queryDataArr.map((currData, idx) => {
                return Object.keys(currData).length === 0 ? (
                  ""
                ) : (
                  <PrettifiedData data={currData} key={idx} />
                );
              })}
            </ul>
            {!newData && queryData && (
              <BtnRegenerateRes
                onBtnEvent={onBtnEvent}
                onComponentDidMount={onComponentDidMount}
                ref={containerRef}
              />
            )}
          </div>
        ) : (
          ""
        )}
        <CustomInput
          inputRef={inputRef}
          searchQuery={searchQuery}
          onSubmit={onBtnEvent}
          setSearchQuery={setSearchQuery}
        />
      </div>
    </AppShell>
  );
}

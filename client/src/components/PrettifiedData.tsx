"use client";
import { Avatar } from "@mantine/core";
import {
  IconError404,
  IconExclamationCircle,
  IconClipboardCheck,
  IconClipboard,
} from "@tabler/icons-react";
import { useState } from "react";
import { formatDataForUI } from "../../lib/helpers";

interface PrettifiedDataProps {
  data: Data;
}

interface Data {
  content: string;
  originalQuery: string;
}

export const PrettifiedData: React.FC<PrettifiedDataProps> = ({ data }) => {
  const [areDataCopied, setAreDataCopied] = useState<boolean>(false);
  try {
    const { content, originalQuery } = data;
    if (!content || content === "" || Object.keys(data).length === 0) {
      return "";
    }
    if (
      !content?.includes("Secondo la documentazione") &&
      !content?.includes("The documentation says")
    )
      return (
        <>
          <UserQuery query={originalQuery} />
          <div
            style={{
              display: "flex",
              gap: "10px",
              //maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <Avatar color="blue" />
            <div
              className="prettified-data"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                borderRadius: "5px",
                width: "100%",
              }}
            >
              {data?.content?.includes("No matches found for your query") ? (
                <IconError404 size={60} />
              ) : (
                <IconExclamationCircle size={60} />
              )}
              <p>{data?.content}</p>
            </div>
          </div>
        </>
      );
    //formatting the data
    const parsedData = content
      ?.replaceAll("<em>", "")
      .replaceAll("</em>", "")
      .replaceAll("\n", "<br />");

    if (!parsedData.slice(parsedData.indexOf(":") + 1)) {
      return "";
    }

    return (
      <>
        <UserQuery query={originalQuery} />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              gap: "10px",
              //maxHeight: "80%",
              overflowY: "auto",
            }}
          >
            <Avatar color="blue" />
            <div
              className="prettified-data"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                borderRadius: "5px",
              }}
            >
              <div
                className="header"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <h2>{content?.slice(0, content?.indexOf(":"))}</h2>
                {areDataCopied ? (
                  <IconClipboardCheck
                    style={{
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(content);
                      setAreDataCopied(true);
                    }}
                  />
                ) : (
                  <IconClipboard
                    style={{
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(content);
                      setAreDataCopied(true);
                    }}
                  />
                )}
              </div>
              <p
                dangerouslySetInnerHTML={{
                  __html: formatDataForUI(parsedData),
                }}
                style={{
                  width: "100% !important",
                }}
              />
            </div>
          </div>
        </div>
      </>
    );
  } catch (err) {
    return "";
  }
};

const UserQuery = ({ query }: { query: string }) => {
  return (
    <div
      style={{
        display: "flex",
        gap: "10px",
        overflowY: "auto",
        justifyContent: "flex-end",
      }}
    >
      <div
        className="prettified-data"
        id="user-query"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          borderRadius: "5px",
          backgroundColor: "#4dabf7 !important",
          width: "fit-content",
          justifyContent: "flex-end",
          alignItems: "flex-end",
        }}
      >
        <h2>Your query</h2>
        <p>{query}</p>
      </div>
      <Avatar color="teal" />
    </div>
  );
};

"use client";
import React, { useEffect, useState } from "react";

import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import QRCode from "qrcode";
import Image from "next/image";

const SESSION = new StringSession(""); //create a new StringSession, also you can use StoreSession
const API_ID = Number(process.env.NEXT_PUBLIC_TELEGRAM_API_ID);
const API_HASH = process.env.NEXT_PUBLIC_TELEGRAM_API_HASH as string;

const tgClient = new TelegramClient(SESSION, API_ID, API_HASH, {
  connectionRetries: 5,
});

type UserState =
  | "scan-qr"
  | "scanned"
  | "saving-user-details"
  | "saved"
  | "error";

export default function TelegramAuth() {
  const [telegramQR, setTelegramQR] = useState<string | null>(null);
  const [, setTokenUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [, setError] = useState<string | null>("Error occurred");

  const [userState, setUserState] = useState<UserState>("scan-qr");

  useEffect(() => {
    (async () => {
      await tgClient.connect();

      try {
        const tgUser = await tgClient.signInUserWithQrCode(
          { apiId: API_ID, apiHash: API_HASH },
          {
            onError: async function (p1: Error): Promise<boolean> {
              setError(p1.message);
              setUserState("error");
              setLoading(false);
              return true;
            },
            qrCode: async (code): Promise<void> => {
              const tokenUrl = `tg://login?token=${code.token.toString(
                "base64"
              )}`;
              setTokenUrl(tokenUrl);
              QRCode.toDataURL(
                tokenUrl,
                function (err: Error | null | undefined, url: string) {
                  if (url) {
                    setTelegramQR(url);
                  }
                }
              );
              setLoading(false);
            },
          }
        );

        setUserState("scanned");

        if (tgUser && tgUser instanceof Api.User) {
          const sessionString = tgClient.session.save();
          const dcId = tgClient.session.dcId;
          const port = tgClient.session.port;
          const authKey =
            tgClient.session.getAuthKey()?.getKey()?.toString("hex") ?? "";

          console.log(
            dcId,
            port,
            authKey,
            sessionString,
            "using dcID, port, authKey only"
          );
          setUserState("saving-user-details");
          // run some mutations here
        } else {
          setError("Failed to get user information");
        }
      } catch (e) {
        console.error(e);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      tgClient.disconnect();
    };
  }, []);

  if (loading && userState === "scan-qr") {
    return (
      <div className="flex h-full w-full justify-center items-center p-4">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center w-full h-full gap-8 p-4">
      {userState === "scan-qr" && (
        <>
          {telegramQR && (
            <Image
              height={200}
              width={200}
              src={telegramQR}
              alt="telegram qr code"
              className="rounded-lg mx-auto"
            />
          )}
          <h2 className="text-2xl font-bold text-center mb-6">
            Log in to Telegram by QR Code
          </h2>

          <InstructionSteps
            steps={[
              "Open Telegram on your phone",
              "Go to Settings &gt; Devices &gt; Link Desktop Device",
              "Point your phone at this screen to confirm login",
            ]}
          />
        </>
      )}
      {userState === "scanned"}
    </div>
  );
}

const InstructionSteps = ({
  steps = [],
  className = "",
}: {
  steps: string[];
  className?: string;
}) => {
  return (
    <div
      className={`max-w-2xl p-6 ${className}`}
      role="region"
      aria-labelledby="instructions-title"
    >
      <ul className="list-none m-0 p-0" role="list">
        {steps.map((step, index) => (
          <li
            key={index}
            className="flex items-center mb-6 last:mb-0 group hover:cursor-default"
          >
            <div
              className="flex-shrink-0 w-8 h-8 bg-blue-400 rounded-full flex items-center justify-center shadow-md transition-all duration-200 ease-in-out group-hover:shadow-lg group-hover:-translate-y-0.5"
              aria-hidden="true"
            >
              <span className="text-white font-semibold" aria-hidden="true">
                {index + 1}
              </span>
            </div>
            <span className="ml-4 text-secondary text-base">{step}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

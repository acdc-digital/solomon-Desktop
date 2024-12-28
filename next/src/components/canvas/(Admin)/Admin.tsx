'use client'

import React from "react";
import { useUser } from "@clerk/clerk-react";

import Image from "next/image";
import { Button } from "../../ui/button";
import { PlusCircle } from "lucide-react";
import EmbeddingGraph from "./_components/EmbeddingGraph";

const Admin = () => {
  const { user } = useUser();

  return (
    <div className="flex flex-col h-screen overflow-y">
      <div className="flex flex-col items-center gap-x-4 border rounded-t-lg bg-gray-50 mt-6 ml-3 mr-6 p-4 pl-4 py-2 justify-end">
          <EmbeddingGraph />
      </div>
    </div>
  );
}

export default Admin;
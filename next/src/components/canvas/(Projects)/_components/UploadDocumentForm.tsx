"use client"

import { z } from "zod"
import {zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useMutation } from "convex/react"
import { api } from "../../../../../convex/_generated/api"

interface UploadDocumentFormProps {
    onUpload: () => void;
    projectId: string;
    parentProject?: string;
  }

const formSchema = z.object({
    title: z.string().min(1).max(250),
    file: z.instanceof(File),
});

export default function UploadDocumentForm({
        onUpload,
        projectId,
        }: UploadDocumentFormProps) {
    const createDocument = useMutation(api.projects.createDocument);
    const generateUploadUrl = useMutation(api.projects.generateUploadUrl);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
        },
    })

    async function onSubmit(values: z.infer<typeof formSchema>) {
        const url = await generateUploadUrl();

        const result = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": values.file.type },
            body: values.file,
        });
        const { storageId } = await result.json();

        await createDocument({
            documentTitle: values.title,
            fileId: storageId as string,
            parentProject: projectId as string,
        });
        onUpload();
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                 <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                        <Input placeholder="Document name." {...field} />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                 />

                <FormField
                    control={form.control}
                    name="file"
                    render={({ field: { value, onChange, ...fieldProps } }) => (
                    <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                        <Input
                            {...fieldProps}
                            type="file"
                            accept=".txt, .xml, .doc, .pdf, application/pdf"
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                onChange(file);
                            }}
                            />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                 />
                  <Button type="submit">Submit</Button>
            </form>
    </Form>
    )
}
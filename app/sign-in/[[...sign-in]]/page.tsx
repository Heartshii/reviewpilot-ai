import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#ffffff",
            colorBackground: "#18181b",
            colorText: "#ffffff",
            colorInputBackground: "#27272a",
            colorInputText: "#ffffff",
          },
        }}
      />
    </div>
  );
}

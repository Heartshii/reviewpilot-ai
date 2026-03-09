import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <SignUp
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

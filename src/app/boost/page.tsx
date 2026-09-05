import { redirect } from "next/navigation";

export default function BoostPage() {
  redirect("/?boost=1");
}

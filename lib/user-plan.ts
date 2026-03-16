export type UserPlan = "free" | "pro";

export function getUserPlan(): UserPlan {

 return "free";
}

export function isProUser(): boolean {
 return getUserPlan() === "pro";
}
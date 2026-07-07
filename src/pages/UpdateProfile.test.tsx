import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UpdateProfile from "./UpdateProfile";

const mockNavigate = vi.fn();
const mockToast = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

vi.mock("@/services/api", () => ({
  getUserMe: vi.fn().mockResolvedValue({
    id: "1",
    fullName: "",
    phone: "",
    email: "",
    avatarUrl: "",
  }),
  updateMyProfile: vi.fn().mockResolvedValue({ phone: "", email: "" }),
}));

describe("UpdateProfile", () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockToast.mockReset();
  });

  it("renders identity document fields", async () => {
    render(<UpdateProfile />);

    expect(await screen.findByLabelText(/ประเภทเอกสาร/i)).toBeInTheDocument();
    expect(await screen.findByLabelText(/เลขบัตรประชาชน|เลขหนังสือเดินทาง/i)).toBeInTheDocument();
  });

  it("renders a scan card button for the document number field", async () => {
    render(<UpdateProfile />);

    expect(await screen.findByRole("button", { name: /scan card/i })).toBeInTheDocument();
  });
});

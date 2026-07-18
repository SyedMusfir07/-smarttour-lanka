/**
 * Algorithm 2 — Surf Inventory Validation
 * 
 * IF (board_inventory − boardsAlreadyReservedForThatSlot − requestedBoards) < 0:
 *     REJECT "Insufficient boards available"
 * ELSE IF instructor_count < CEIL(requestedStudents / 4):
 *     REJECT "Instructor capacity exceeded — 4:1 safety ratio"
 * ELSE:
 *     CONFIRM booking
 */

export interface SurfValidationInput {
  boardInventory: number;
  boardsAlreadyReserved: number;
  requestedBoards: number;
  instructorCount: number;
  requestedStudents: number;
}

export interface SurfValidationResult {
  valid: boolean;
  error?: string;
  boardsAvailable: number;
  instructorsNeeded: number;
  instructorsAvailable: number;
}

export function validateSurfBooking(input: SurfValidationInput): SurfValidationResult {
  const boardsAvailable = input.boardInventory - input.boardsAlreadyReserved;
  const instructorsNeeded = Math.ceil(input.requestedStudents / 4);

  if (boardsAvailable < input.requestedBoards) {
    return {
      valid: false,
      error: `Insufficient boards available. Only ${boardsAvailable} board(s) available, ${input.requestedBoards} requested.`,
      boardsAvailable,
      instructorsNeeded,
      instructorsAvailable: input.instructorCount,
    };
  }

  if (input.instructorCount < instructorsNeeded) {
    return {
      valid: false,
      error: `Instructor capacity exceeded — 4:1 safety ratio. Need ${instructorsNeeded} instructor(s), have ${input.instructorCount}.`,
      boardsAvailable,
      instructorsNeeded,
      instructorsAvailable: input.instructorCount,
    };
  }

  return {
    valid: true,
    boardsAvailable,
    instructorsNeeded,
    instructorsAvailable: input.instructorCount,
  };
}

/**
 * Algorithm 3 — Yoga Mat Controller
 * 
 * IF (current_occupancy + requestedSlots) <= max_mat_capacity:
 *     CONFIRM, increment current_occupancy
 * ELSE:
 *     WAITLIST
 */

export interface YogaValidationInput {
  currentOccupancy: number;
  maxMatCapacity: number;
  requestedSlots: number;
}

export interface YogaValidationResult {
  valid: boolean;
  availableSlots: number;
  isWaitlisted: boolean;
  occupancyAfter: number;
}

export function validateYogaBooking(input: YogaValidationInput): YogaValidationResult {
  const availableSlots = input.maxMatCapacity - input.currentOccupancy;
  const occupancyAfter = input.currentOccupancy + input.requestedSlots;
  const isWaitlisted = occupancyAfter > input.maxMatCapacity;

  return {
    valid: !isWaitlisted,
    availableSlots,
    isWaitlisted,
    occupancyAfter: isWaitlisted ? input.currentOccupancy : occupancyAfter,
  };
}

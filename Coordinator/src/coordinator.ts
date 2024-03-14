import { Bytes, log } from "@graphprotocol/graph-ts";
import {
  Coordinator,
  StartRitual as StartRitualEvent,
  TranscriptPosted as TranscriptPostedEvent,
  StartAggregationRound as StartAggregationRoundEvent,
} from "../generated/Coordinator/Coordinator";
import { Ritual, RitualCounter } from "../generated/schema";

export function handleStartRitual(event: StartRitualEvent): void {
  const ritualInst = Coordinator.bind(event.address).rituals(
    event.params.ritualId,
  );

  const ritual = new Ritual(event.params.ritualId.toString());
  ritual.initiator = ritualInst.getInitiator();
  ritual.initTimestamp = ritualInst.getInitTimestamp();
  ritual.endTimestamp = ritualInst.getEndTimestamp();
  ritual.authority = event.params.authority;
  ritual.dkgSize = ritualInst.getDkgSize();
  ritual.threshold = ritualInst.getThreshold();
  ritual.accessController = ritualInst.getAccessController();
  ritual.participants = changetype<Bytes[]>(event.params.participants);
  ritual.postedTranscriptsAmount = 0;
  ritual.postedTranscripts = [];
  ritual.status = "DKG_AWAITING_TRANSCRIPTS";
  ritual.save();

  let ritualCounter = RitualCounter.load("Counter");
  if (!ritualCounter) {
    ritualCounter = new RitualCounter("Counter");
    ritualCounter.total = 0;
    ritualCounter.active = 0;
  }

  ritualCounter.total = ritualCounter.total + 1;
  ritualCounter.save();
}

export function handleTranscriptPosted(event: TranscriptPostedEvent): void {
  const ritual = Ritual.load(event.params.ritualId.toString());
  if (!ritual) {
    log.error("Node {} posted a transcript for unknown ritual: {}", [
      event.params.node.toHexString(),
      event.params.ritualId.toString(),
    ]);
    return;
  }
  const postedTranscripts = ritual.postedTranscripts;
  postedTranscripts.push(event.params.node);
  ritual.postedTranscripts = postedTranscripts;
  ritual.postedTranscriptsAmount = ritual.postedTranscriptsAmount + 1;
  ritual.save();
}

export function handleStartAggregationRound(
  event: StartAggregationRoundEvent,
): void {
  const ritual = Ritual.load(event.params.ritualId.toString());
  if (!ritual) {
    log.error("Received StartAggregationRound event for unknown ritual", []);
    return;
  }
  ritual.status = "DKG_AWAITING_AGGREGATIONS";
  ritual.save();
}

import { Optional } from "../../types";
import { PackageTargetSystem } from "./PackageTargetSystem";
import { PackageType } from "./PackageType";
import { PackageVersionInfo } from "./PackageVersionInfo";

export interface PackageInfo {
    id: Optional<string>;
    name: Optional<string>;
    shortDescription: Optional<string>;
    overview: Optional<string>;
    isPremium: boolean;
    adult: boolean;
    richDescUrl: Optional<string>;
    thumbImage: Optional<string>;
    previewImage: Optional<string>;
    type: Optional<PackageType>;
    targetFileName: Optional<string>;
    owner: Optional<string>;
    category: Optional<string>;
    tileColor: Optional<string>;
    featureId: Optional<string>;
    regInfo: Optional<string>;
    price: number;
    targetSystem: PackageTargetSystem;
    guid: Optional<string>;
    totalRating: Optional<number>;
    avgRating: Optional<number>;
    isRegistered: boolean;
    expDate: Date;
    versions: PackageVersionInfo[];
    enableInAppStore: boolean;
    installs: number;
}

-- AlterTable
ALTER TABLE "PointOfInterest" ADD COLUMN     "altitudeM" INTEGER,
ADD COLUMN     "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "images" TEXT[] DEFAULT ARRAY[]::TEXT[];

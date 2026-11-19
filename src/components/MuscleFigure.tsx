import atlasUrl from '../assets/anatomy-atlas.webp';
import type { Metric } from '../domain/metrics';
import styles from './MuscleMap.module.scss';

export type MuscleView = 'front' | 'back';
export type ZoneStatus = 'none' | 'measured' | 'outside' | 'reached';

type Region = {
  metric: Metric;
  outlines: readonly string[];
};

// Each side follows its own garment seams in the 1312 × 1199 atlas.
// The atlas panels are asymmetric, so paired regions cannot be mirrored.
const front: readonly Region[] = [
  {
    metric: 'shoulders',
    outlines: [
      'M 273 195 C 250 196 226 211 216 232 C 210 246 206 264 208 280 C 208 292 215 294 225 286 C 241 274 255 256 267 237 C 279 218 288 201 273 195 Z',
      'M 481 195 C 501 197 518 212 528 232 C 535 247 539 264 539 280 C 540 292 534 296 524 289 C 508 279 491 257 479 237 C 468 219 464 198 481 195 Z',
    ],
  },
  {
    metric: 'chest',
    outlines: [
      'M 280 225 C 301 214 332 217 353 224 C 366 227 372 233 372 245 L 372 291 C 365 308 343 317 322 317 C 297 316 277 306 268 287 C 260 271 259 247 280 225 Z',
      'M 390 226 C 413 218 443 214 462 225 C 482 237 489 258 483 277 C 478 301 458 314 433 317 C 412 320 388 313 379 297 L 379 245 C 379 235 382 230 390 226 Z',
    ],
  },
  {
    metric: 'upperArm',
    outlines: [
      'M 208 286 C 218 296 229 289 243 275 C 252 286 260 299 263 315 C 269 337 256 361 246 380 C 240 391 238 401 234 410 C 215 418 195 406 184 390 C 190 373 195 355 196 337 C 196 317 201 299 208 286 Z',
      'M 505 275 C 518 290 531 298 540 287 C 547 303 551 321 552 341 C 553 358 559 379 565 391 C 554 406 536 418 515 411 C 510 396 505 383 497 368 C 486 349 481 330 485 314 C 488 299 495 285 505 275 Z',
    ],
  },
  {
    metric: 'forearm',
    outlines: [
      'M 184 390 C 195 406 215 418 234 410 C 231 435 224 459 213 483 C 201 509 196 531 192 549 L 155 547 C 159 527 162 500 164 475 C 165 446 171 417 184 390 Z',
      'M 565 391 C 578 418 584 446 583 473 C 586 501 588 526 591 548 L 556 550 C 551 527 545 508 534 483 C 524 458 516 435 515 411 C 536 418 554 406 565 391 Z',
    ],
  },
  {
    metric: 'waist',
    outlines: [
      'M 270 290 C 281 309 300 318 322 318 C 344 319 365 310 375 299 C 385 312 410 320 433 318 C 455 317 474 304 482 285 C 483 309 481 333 476 351 C 468 377 463 398 462 412 C 462 433 466 453 466 473 Q 375 493 284 473 C 284 456 289 432 289 411 C 286 390 281 369 275 350 C 271 330 268 309 270 290 Z',
    ],
  },
  {
    metric: 'thigh',
    outlines: [
      'M 275 515 C 304 523 340 527 372 526 L 372 612 C 370 636 367 663 360 688 C 351 720 345 752 334 791 C 316 777 296 766 277 765 L 260 790 C 257 769 252 747 250 725 C 247 702 247 676 248 651 C 251 603 263 555 275 515 Z',
      'M 378 526 C 409 527 443 523 473 515 C 485 556 498 603 501 651 C 504 677 502 703 500 725 C 498 747 493 769 488 790 L 476 766 C 456 769 437 779 414 791 C 405 755 399 721 390 690 C 383 662 379 636 378 613 Z',
    ],
  },
  {
    metric: 'calf',
    outlines: [
      'M 249 853 C 244 868 237 884 235 901 C 233 927 237 952 243 980 C 247 1005 250 1035 248 1067 L 289 1067 C 289 1044 293 1017 299 996 C 305 971 317 949 318 923 C 320 899 316 878 317 859 L 281 890 C 267 876 257 868 249 853 Z',
      'M 499 853 C 505 868 510 884 512 901 C 514 927 510 953 507 978 C 502 1007 498 1036 499 1067 L 458 1067 C 459 1044 454 1016 449 996 C 443 973 430 949 429 923 C 427 899 431 878 430 859 L 473 890 C 486 876 493 866 499 853 Z',
    ],
  },
];

const back: readonly Region[] = [
  {
    metric: 'shoulders',
    outlines: [
      'M 824 195 C 805 199 788 213 778 234 C 771 249 767 265 769 285 C 788 273 807 257 819 240 C 831 221 835 201 824 195 Z',
      'M 1050 195 C 1069 199 1085 212 1094 233 C 1100 249 1100 269 1100 287 C 1082 274 1062 258 1051 240 C 1040 221 1038 201 1050 195 Z',
    ],
  },
  {
    metric: 'chest',
    outlines: [
      'M 897 164 Q 937 169 977 164 C 994 175 1016 187 1026 201 C 1041 217 1048 241 1047 268 C 1048 290 1042 311 1037 330 L 1035 360 Q 987 372 937 374 Q 884 372 836 360 C 832 350 828 335 825 315 C 822 296 822 281 825 268 C 828 236 836 214 848 201 C 864 185 882 175 897 164 Z',
    ],
  },
  {
    metric: 'upperArm',
    outlines: [
      'M 769 285 C 785 275 804 261 815 247 C 820 269 823 299 821 323 C 817 349 808 379 797 411 C 778 416 760 403 748 383 C 752 365 756 346 756 331 C 757 313 760 296 769 285 Z',
      'M 1054 247 C 1065 263 1083 278 1100 287 C 1105 297 1110 310 1112 330 C 1115 348 1118 364 1124 380 C 1111 401 1092 416 1075 411 C 1063 380 1054 349 1050 326 C 1047 301 1048 270 1054 247 Z',
    ],
  },
  {
    metric: 'forearm',
    outlines: [
      'M 748 383 C 760 403 778 416 797 411 C 792 438 784 466 771 492 C 759 519 755 538 751 553 L 715 550 C 719 527 722 502 723 475 C 725 440 732 411 748 383 Z',
      'M 1124 380 C 1138 407 1145 438 1147 470 C 1150 500 1152 527 1156 552 L 1120 555 C 1114 531 1105 507 1094 484 C 1084 459 1078 435 1075 411 C 1092 416 1111 401 1124 380 Z',
    ],
  },
  {
    metric: 'waist',
    outlines: [
      'M 836 360 Q 884 372 937 374 Q 987 372 1035 360 C 1027 379 1022 398 1024 416 C 1023 433 1025 451 1030 468 L 844 468 C 848 445 849 426 848 410 C 849 393 842 373 836 360 Z',
    ],
  },
  {
    metric: 'hips',
    outlines: [
      'M 855 511 L 934 514 L 934 577 C 934 602 919 617 898 623 C 877 630 850 622 837 607 C 824 592 829 569 836 548 C 841 534 848 520 855 511 Z',
      'M 939 514 L 1022 512 C 1031 531 1038 550 1041 569 C 1046 591 1040 608 1023 617 C 1007 627 980 628 962 617 C 945 607 938 592 939 575 Z',
    ],
  },
  {
    metric: 'thigh',
    outlines: [
      'M 831 586 C 834 608 850 622 872 626 C 895 632 920 621 933 602 C 936 623 931 653 926 677 C 918 714 908 747 899 790 C 883 771 863 760 842 756 L 823 790 C 820 767 816 744 812 723 C 808 699 807 677 808 653 C 810 626 817 605 831 586 Z',
      'M 1043 587 C 1054 610 1062 630 1064 653 C 1066 677 1064 700 1061 724 C 1058 747 1052 770 1047 790 L 1032 756 C 1009 760 989 772 972 790 C 963 752 952 715 946 682 C 941 655 937 625 940 601 C 953 622 976 631 999 626 C 1023 623 1038 607 1043 587 Z',
    ],
  },
  {
    metric: 'calf',
    outlines: [
      'M 812 851 C 803 873 795 897 795 924 C 795 950 801 977 805 1000 C 809 1027 811 1052 809 1079 L 849 1080 C 850 1053 856 1026 862 1000 C 868 973 878 950 880 925 C 882 904 879 882 879 864 C 873 878 864 886 856 895 C 843 882 827 874 812 851 Z',
      'M 1057 851 C 1065 874 1073 898 1073 924 C 1074 950 1069 977 1065 1000 C 1061 1027 1058 1052 1059 1079 L 1018 1080 C 1017 1053 1011 1027 1006 1000 C 999 974 989 950 988 925 C 987 903 990 882 990 864 C 997 878 1005 887 1014 895 C 1027 882 1043 874 1057 851 Z',
    ],
  },
];

const plates = {
  front: { regions: front, viewBox: '102 -24 546 1250' },
  back: { regions: back, viewBox: '663 -24 546 1250' },
} as const;

function RegionPaths({ region }: { region: Region }) {
  return region.outlines.map((outline) => <path key={outline} d={outline} vectorEffect="non-scaling-stroke" />);
}

export function MuscleFigure({ view, selected, statuses, onSelect }: {
  view: MuscleView;
  selected: Metric;
  statuses: Readonly<Partial<Record<Metric, ZoneStatus>>>;
  onSelect: (metric: Metric) => void;
}) {
  const { regions, viewBox } = plates[view];
  const selectedRegion = regions.find(({ metric }) => metric === selected);

  return (
    <svg className={styles['muscle-figure']} viewBox={viewBox} aria-hidden="true" focusable="false" data-view={view}>
      <image href={atlasUrl} width={1312} height={1199} pointerEvents="none" />
      {regions.map((region) => (
        <g
          key={region.metric}
          className={styles['muscle-figure__zone']}
          data-metric={region.metric}
          data-status={statuses[region.metric] ?? 'none'}
          data-selected={selected === region.metric}
          onClick={() => onSelect(region.metric)}
        >
          <RegionPaths region={region} />
        </g>
      ))}
      {selectedRegion ? (
        <g className={styles['muscle-figure__outline']}>
          <RegionPaths region={selectedRegion} />
        </g>
      ) : null}
    </svg>
  );
}
